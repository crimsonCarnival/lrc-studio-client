import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { HocuspocusProvider } from '@hocuspocus/provider'
import type { CollabMe, CollabPeer, CollabRole, PlayheadState, PointerState } from './collab.types'

export const POINTER_THROTTLE_MS = 50
export const PLAYHEAD_THROTTLE_MS = 250

/** Where a remote playhead is now: it advances by `rate` seconds per second while it was playing when received. */
export function extrapolate(p: PlayheadState, receivedAt: number, now: number): number {
  if (!p.playing) return p.t
  return p.t + Math.max(0, now - receivedAt) / 1000 * p.rate
}

type AwarenessUser = { name: string; colorIndex: number; role: CollabRole; subject: string }
type AwarenessState = {
  user?: AwarenessUser
  pointer?: PointerState
  playhead?: PlayheadState | null
  activeLineId?: string | null
  duration?: number | null
}
type LocalField = 'pointer' | 'playhead' | 'activeLineId' | 'duration'

const NO_PEERS: CollabPeer[] = []
const ROLES: readonly string[] = ['owner', 'editor', 'viewer']

function isUser(u: unknown): u is AwarenessUser {
  if (typeof u !== 'object' || u === null) return false
  const { name, colorIndex, role, subject } = u as Record<string, unknown>
  return typeof name === 'string' && typeof subject === 'string' && typeof colorIndex === 'number'
    && typeof role === 'string' && ROLES.includes(role)
}

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

// Remote states are untrusted: anything of the wrong shape reads as "not there".
function readPointer(p: unknown): PointerState {
  if (typeof p !== 'object' || p === null) return null
  const o = p as Record<string, unknown>
  if (o.area === 'waveform' && finite(o.time)) return { area: 'waveform', time: o.time }
  if (o.area === 'lines' && typeof o.lineId === 'string' && finite(o.xRatio) && finite(o.yRatio)) {
    return { area: 'lines', lineId: o.lineId, xRatio: o.xRatio, yRatio: o.yRatio }
  }
  return null
}

function readPlayhead(p: unknown): PlayheadState | null {
  if (typeof p !== 'object' || p === null) return null
  const o = p as Record<string, unknown>
  return finite(o.t) && typeof o.playing === 'boolean' && finite(o.rate) ? { t: o.t, playing: o.playing, rate: o.rate } : null
}

const samePlayhead = (a: PlayheadState | null, b: PlayheadState | null) =>
  a === b || (a !== null && b !== null && a.t === b.t && a.playing === b.playing && a.rate === b.rate)

function samePointer(a: PointerState, b: PointerState): boolean {
  if (a === b) return true
  if (a === null || b === null || a.area !== b.area) return false
  if (a.area === 'waveform' && b.area === 'waveform') return a.time === b.time
  if (a.area === 'lines' && b.area === 'lines') return a.lineId === b.lineId && a.xRatio === b.xRatio && a.yRatio === b.yRatio
  return false
}

/**
 * Leading + trailing throttle: the first call goes out at once, later ones inside the
 * window collapse into a single call with the latest value when the window ends.
 */
function createThrottle<T>(ms: number, send: (value: T) => void) {
  let last = -Infinity
  let timer: ReturnType<typeof setTimeout> | null = null
  let pendingValue: T | undefined
  let hasPending = false
  const flush = () => {
    timer = null
    if (!hasPending) return
    hasPending = false
    last = Date.now()
    send(pendingValue as T)
  }
  return {
    push(value: T) {
      const wait = last + ms - Date.now()
      if (wait <= 0 && timer === null) {
        last = Date.now()
        send(value)
        return
      }
      pendingValue = value
      hasPending = true
      if (timer === null) timer = setTimeout(flush, Math.max(0, wait))
    },
    cancel() {
      if (timer !== null) clearTimeout(timer)
      timer = null
      hasPending = false
    },
  }
}

export type Awareness = {
  peers: CollabPeer[]
  /** Throttled to one update per 50 ms; the latest value always goes out. */
  setPointer: (p: PointerState) => void
  /** Throttled to one update per 250 ms; the latest value always goes out. */
  setPlayhead: (p: PlayheadState | null) => void
  setActiveLine: (id: string | null) => void
  /** Duration in seconds of the media loaded locally, null when there is none. Not throttled. */
  setDuration: (d: number | null) => void
}

type Setters = {
  pointer: ReturnType<typeof createThrottle<PointerState>>
  playhead: ReturnType<typeof createThrottle<PlayheadState | null>>
  field: (key: LocalField, value: unknown) => void
}

function samePeer(a: CollabPeer, b: CollabPeer): boolean {
  return a.name === b.name && a.subject === b.subject && a.colorIndex === b.colorIndex && a.role === b.role && a.activeLineId === b.activeLineId
    && a.duration === b.duration && samePointer(a.pointer, b.pointer) && samePlayhead(a.playhead, b.playhead)
}

/**
 * Presence over Hocuspocus awareness: who else is here, where their pointer is, where
 * their player is and which line they are on. Awareness only: nothing here touches the
 * Y.Doc, and nothing waits on the network. Without a session (`provider === null`) every
 * setter does nothing and `peers` stays empty.
 *
 * `me` supplies the published identity; nothing is published until it is known (the
 * server's hello), and peers that have not published one yet are skipped.
 */
export function useAwareness(provider: HocuspocusProvider | null, me: CollabMe | null): Awareness {
  const [peers, setPeers] = useState<CollabPeer[]>([])
  const known = useRef<Map<number, CollabPeer>>(new Map())
  const setters = useRef<Setters | null>(null)
  // Re-published when the provider or identity changes (a reconnect builds a fresh awareness state).
  const latest = useRef<Record<LocalField, unknown>>({ pointer: null, playhead: null, activeLineId: null, duration: null })

  const name = me?.name ?? null
  const colorIndex = me?.colorIndex ?? null
  const role = me?.role ?? null

  // Buffered values belong to the connection they were made for. A layout effect, because it must
  // run before any passive effect: children buffer their first values (the cursor line, the media
  // duration) in theirs while the identity is still unknown, and those must survive until it arrives.
  useLayoutEffect(() => {
    latest.current = { pointer: null, playhead: null, activeLineId: null, duration: null }
  }, [provider])

  useEffect(() => {
    const awareness = provider?.awareness
    if (!provider || !awareness || name === null || colorIndex === null || role === null) {
      setters.current = null
      known.current = new Map()
      return
    }

    let alive = true
    const field = (key: LocalField, value: unknown) => {
      latest.current[key] = value
      if (alive) awareness.setLocalStateField(key, value)
    }
    awareness.setLocalState({ ...latest.current, user: { name, colorIndex, role } })

    const pointer = createThrottle<PointerState>(POINTER_THROTTLE_MS, (v) => field('pointer', v))
    const playhead = createThrottle<PlayheadState | null>(PLAYHEAD_THROTTLE_MS, (v) => field('playhead', v))
    setters.current = { pointer, playhead, field }

    const selfId = awareness.clientID
    const refresh = () => {
      const next = new Map<number, CollabPeer>()
      const now = Date.now()
      awareness.getStates().forEach((raw, clientId) => {
        if (clientId === selfId) return
        const s = raw as AwarenessState
        if (!isUser(s.user)) return
        const old = known.current.get(clientId)
        const playheadNow = readPlayhead(s.playhead)
        const candidate: CollabPeer = {
          clientId,
          name: s.user.name,
          subject: s.user.subject,
          colorIndex: s.user.colorIndex,
          role: s.user.role,
          pointer: readPointer(s.pointer),
          playhead: playheadNow,
          activeLineId: typeof s.activeLineId === 'string' ? s.activeLineId : null,
          duration: finite(s.duration) && s.duration >= 0 ? s.duration : null,
          // Remote states are re-decoded on every update, so the playhead is compared by value:
          // a pointer-only update must not restart the extrapolation from an old position.
          receivedAt: old && samePlayhead(old.playhead, playheadNow) ? old.receivedAt : now,
        }
        // The old object stays when nothing about the peer changed: consumers memoise on it.
        next.set(clientId, old && samePeer(old, candidate) ? old : candidate)
      })
      known.current = next
      // Own publishes fire 'change' too: keep the same array when no peer object changed.
      setPeers((prev) => (prev.length === next.size && prev.every((p) => next.get(p.clientId) === p) ? prev : [...next.values()]))
    }
    const onDestroy = () => { alive = false }
    awareness.on('change', refresh)
    awareness.on('destroy', onDestroy)
    refresh()

    return () => {
      alive = false
      pointer.cancel()
      playhead.cancel()
      awareness.off('change', refresh)
      awareness.off('destroy', onDestroy)
      setters.current = null
      // Leave the room. When the provider is already destroyed its own teardown did this.
      try {
        if (provider.awareness === awareness && awareness.getLocalState() !== null) awareness.setLocalState(null)
      } catch { /* awareness already destroyed */ }
    }
  }, [provider, name, colorIndex, role])

  // Before the identity is known there is nobody to publish to: the value is kept and goes out with it.
  const setPointer = useCallback((p: PointerState) => {
    if (setters.current) setters.current.pointer.push(p)
    else latest.current.pointer = p
  }, [])
  const setPlayhead = useCallback((p: PlayheadState | null) => {
    if (setters.current) setters.current.playhead.push(p)
    else latest.current.playhead = p
  }, [])
  const setActiveLine = useCallback((id: string | null) => {
    if (setters.current) setters.current.field('activeLineId', id)
    else latest.current.activeLineId = id
  }, [])
  const setDuration = useCallback((d: number | null) => {
    if (setters.current) setters.current.field('duration', d)
    else latest.current.duration = d
  }, [])

  // Peers of a connection that is gone (or has no identity yet) are not shown.
  const listed = provider && name !== null ? peers : NO_PEERS
  return useMemo(
    () => ({ peers: listed, setPointer, setPlayhead, setActiveLine, setDuration }),
    [listed, setPointer, setPlayhead, setActiveLine, setDuration],
  )
}
