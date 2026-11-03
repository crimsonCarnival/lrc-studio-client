import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import type { HocuspocusProvider } from '@hocuspocus/provider'
import type { CollabMe, LockSnapshot } from './collab.types'

/** Locks idle for longer than this on the server expire; held lines are refreshed well inside it. */
export const HEARTBEAT_MS = 10_000

export type LineLocks = {
  /** The server's lock table (mine and everyone else's), keyed by line id. */
  locks: LockSnapshot
  /** Only the locks held by other connections: a row re-renders when its own entry changes. */
  othersLocks: LockSnapshot
  isLockedByOther: (lineId: string) => boolean
  /** Asks for the lock. Fire-and-forget: the answer arrives in `locks` (or as a denial). */
  claim: (lineId: string) => void
  release: (lineId: string) => void
  /** Runs `write` now if the lock is held, once it is granted otherwise, never if it is denied. */
  withLock: (lineId: string, write: () => void) => void
}

type Options = {
  /** A requested or re-acquired lock was refused (after the toast). */
  onDenied?: (lineId: string) => void
}

type StatelessIn = { payload: string }
type StatusIn = { status: string }

function deniedLine(payload: string): string | null {
  try {
    const msg: unknown = JSON.parse(payload)
    if (typeof msg !== 'object' || msg === null) return null
    const { t, lineId } = msg as { t?: unknown; lineId?: unknown }
    return t === 'lock-denied' && typeof lineId === 'string' ? lineId : null
  } catch {
    return null
  }
}

/**
 * Line locks, arbitrated by the server (see collab.server.ts). The lock table comes in
 * as `locks` (useCollabSession keeps the latest snapshot, so none is missed before this
 * mounts); this hook only sends requests and listens for `lock-denied`.
 *
 * Nothing here is awaited: `withLock` either runs the write now or parks it until the
 * snapshot shows this connection as the holder, so the mark path (audio clock, highlight
 * loop) never waits on the network. Without a session (`provider === null`) it just runs the write.
 *
 * Bookkeeping, all in refs because none of it renders:
 * - intents: lines the UI wants held (an open text editor, the sync cursor), counted so two
 *   reasons to hold one line don't release each other. Re-claimed after a reconnect.
 * - pending: writes parked until their lock is granted. Dropped on disconnect, because the
 *   server freed this connection's locks and a write that late would land unlocked.
 * - requested: lock requests in flight, so queued writes share one request.
 * - waiting: requests held back until the line exists in the local doc. The server denies a
 *   lock for a line it does not have, and a line inserted in this very commit reaches the doc
 *   in a parent's effect, after this hook's callers have already claimed it. The provider sends
 *   doc updates on the same socket in order, so a lock sent after the local doc holds the line
 *   arrives after the update that creates it.
 */
export function useLineLocks(
  provider: HocuspocusProvider | null,
  me: CollabMe | null,
  locks: LockSnapshot,
  options: Options = {},
): LineLocks {
  const { t } = useTranslation()
  const conn = me?.conn ?? null

  const providerRef = useRef(provider)
  const connRef = useRef(conn)
  const locksRef = useRef(locks)
  const onDeniedRef = useRef(options.onDenied)
  const tRef = useRef(t)
  useLayoutEffect(() => {
    providerRef.current = provider
    connRef.current = conn
    locksRef.current = locks
    onDeniedRef.current = options.onDenied
    tRef.current = t
  })

  const intents = useRef(new Map<string, number>())
  const pending = useRef(new Map<string, (() => void)[]>())
  const requested = useRef(new Set<string>())
  const waiting = useRef(new Set<string>())
  // True from the server's hello until the socket drops.
  const live = useRef(false)

  const send = useCallback((msg: object) => {
    providerRef.current?.sendStateless(JSON.stringify(msg))
  }, [])

  const isHeld = useCallback(
    (lineId: string) => connRef.current !== null && locksRef.current[lineId]?.holderConn === connRef.current,
    [],
  )

  const inDoc = useCallback(
    (lineId: string) => providerRef.current?.document.getMap('lines').has(lineId) ?? false,
    [],
  )

  const request = useCallback((lineId: string) => {
    if (!live.current || requested.current.has(lineId) || isHeld(lineId)) return
    if (!inDoc(lineId)) {
      waiting.current.add(lineId)
      return
    }
    waiting.current.delete(lineId)
    requested.current.add(lineId)
    send({ t: 'lock', lineId })
  }, [isHeld, inDoc, send])

  const unlock = useCallback((lineId: string) => {
    const had = isHeld(lineId) || requested.current.has(lineId)
    requested.current.delete(lineId)
    waiting.current.delete(lineId)
    if (had && live.current) send({ t: 'unlock', lineId })
  }, [isHeld, send])

  const claim = useCallback((lineId: string) => {
    if (!providerRef.current) return
    intents.current.set(lineId, (intents.current.get(lineId) ?? 0) + 1)
    request(lineId)
  }, [request])

  const release = useCallback((lineId: string) => {
    const n = intents.current.get(lineId)
    if (n === undefined) return
    if (n > 1) {
      intents.current.set(lineId, n - 1)
      return
    }
    intents.current.delete(lineId)
    // A write is still waiting for this lock (a mark made just before the cursor moved on):
    // the grant effect lets go of the lock once it has run.
    if (!pending.current.has(lineId)) unlock(lineId)
  }, [unlock])

  const withLock = useCallback((lineId: string, write: () => void) => {
    if (!providerRef.current || isHeld(lineId)) {
      write()
      return
    }
    // Not connected: parking the write would replay it on a later connection, long after
    // the moment it was made. Drop it, like a denial.
    if (!live.current) {
      toast.error(tRef.current('collab.locks.offline'), { id: 'collab-lock-offline' })
      return
    }
    const queue = pending.current.get(lineId)
    if (queue) queue.push(write)
    else pending.current.set(lineId, [write])
    request(lineId)
  }, [isHeld, request])

  // Grants: run the writes parked on every line this connection now holds.
  useEffect(() => {
    if (!conn || pending.current.size === 0) return
    for (const [lineId, writes] of [...pending.current]) {
      if (locks[lineId]?.holderConn !== conn) continue
      pending.current.delete(lineId)
      requested.current.delete(lineId)
      writes.forEach((write) => write())
      // Nothing else wants this line (no open editor, no sync cursor): don't keep it alive.
      if (!intents.current.has(lineId)) unlock(lineId)
    }
  }, [locks, conn, unlock])

  // A new hello means a fresh connection (the first, or after a reconnect): ask again
  // for what the UI still wants, plus any write that was queued before the hello arrived.
  useEffect(() => {
    if (!provider || !conn) return
    live.current = true
    requested.current.clear()
    for (const lineId of new Set([...intents.current.keys(), ...pending.current.keys()])) request(lineId)
  }, [provider, conn, request])

  useEffect(() => {
    if (!provider) return
    const onStateless = ({ payload }: StatelessIn) => {
      const lineId = deniedLine(payload)
      if (!lineId) return
      requested.current.delete(lineId)
      pending.current.delete(lineId)
      waiting.current.delete(lineId)
      intents.current.delete(lineId)
      const holder = locksRef.current[lineId]
      const translate = tRef.current
      toast.error(
        holder ? translate('collab.locks.denied', { name: holder.name }) : translate('collab.locks.deniedGeneric'),
        { id: `collab-lock-denied-${lineId}` },
      )
      onDeniedRef.current?.(lineId)
    }
    const onStatus = ({ status }: StatusIn) => {
      if (status !== 'disconnected') return
      live.current = false
      requested.current.clear()
      pending.current.clear()
      waiting.current.clear()
    }
    // Runs after the provider's own update handler (registered when it was built).
    const onDocUpdate = () => {
      for (const lineId of [...waiting.current]) if (inDoc(lineId)) request(lineId)
    }
    provider.on('stateless', onStateless)
    provider.on('status', onStatus)
    provider.document.on('update', onDocUpdate)

    const beat = setInterval(() => {
      if (!live.current) return
      const mine = Object.keys(locksRef.current).filter(isHeld)
      // Open editors too: a lock lost to expiry is re-acquired (or refused) by the heartbeat.
      const lineIds = [...new Set([...mine, ...[...intents.current.keys()].filter(inDoc)])]
      if (lineIds.length > 0) send({ t: 'heartbeat', lineIds })
    }, HEARTBEAT_MS)

    const parked = pending.current
    const waited = waiting.current
    return () => {
      provider.off('stateless', onStateless)
      provider.off('status', onStatus)
      provider.document.off('update', onDocUpdate)
      clearInterval(beat)
      parked.clear()
      waited.clear()
      live.current = false
    }
  }, [provider, isHeld, inDoc, request, send])

  const othersLocks = useMemo(() => {
    const out: LockSnapshot = {}
    for (const [lineId, holder] of Object.entries(locks)) if (holder.holderConn !== conn) out[lineId] = holder
    return out
  }, [locks, conn])

  const isLockedByOther = useCallback((lineId: string) => lineId in othersLocks, [othersLocks])

  return useMemo(
    () => ({ locks, othersLocks, isLockedByOther, claim, release, withLock }),
    [locks, othersLocks, isLockedByOther, claim, release, withLock],
  )
}
