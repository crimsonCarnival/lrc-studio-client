import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { HocuspocusProvider } from '@hocuspocus/provider'
import type { CollabMe, CollabPeer, CollabRole, PlayheadState, PointerInput, PointerState, PresenceView } from './collab.types'

export const POINTER_THROTTLE_MS = 50
export const PLAYHEAD_THROTTLE_MS = 250

/** Where a remote playhead is now: it advances by `rate` seconds per second while it was playing when received. */
export function extrapolate(p: PlayheadState, receivedAt: number, now: number): number {
  if (!p.playing) return p.t
  return p.t + Math.max(0, now - receivedAt) / 1000 * p.rate
}

type AwarenessUser = { name: string; colorIndex: number; role: CollabRole; subject: string; avatarUrl?: string | null }
type AwarenessState = {
  user?: AwarenessUser
  pointer?: PointerState
  playhead?: PlayheadState | null
  activeLineId?: string | null
  duration?: number | null
  view?: PresenceView | null
}
type LocalField = 'pointer' | 'playhead' | 'activeLineId' | 'duration' | 'view'

const NO_PEERS: CollabPeer[] = []
const ROLES: readonly string[] = ['owner', 'editor', 'viewer']
const VIEWS: readonly PresenceView[] = ['editor', 'words-focus', 'preview', 'mobile']
const readView = (v: unknown): PresenceView | null => (VIEWS as readonly unknown[]).includes(v) ? v as PresenceView : null
/** Views with no line list to point at: their pointer is null. */
const pointerless = (v: unknown) => v === 'preview' || v === 'mobile'
const emptyLocal = (): Record<LocalField, unknown> => ({ pointer: null, playhead: null, activeLineId: null, duration: null, view: null })

function isUser(u: unknown): u is AwarenessUser {
  if (typeof u !== 'object' || u === null) return false
  const { name, colorIndex, role, subject, avatarUrl } = u as Record<string, unknown>
  const avatarOk = avatarUrl === undefined || avatarUrl === null || typeof avatarUrl === 'string'
  return typeof name === 'string' && typeof subject === 'string' && typeof colorIndex === 'number'
    && typeof role === 'string' && ROLES.includes(role) && avatarOk
}

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

/** Line ids are UUIDs; anything much longer is not a line id. */
export const MAX_LINE_ID_LENGTH = 64
/** Fastest playback speed a peer's playhead is extrapolated at. */
export const MAX_PLAYHEAD_RATE = 4

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const lineIdOf = (v: unknown): string | null =>
  typeof v === 'string' && v.length <= MAX_LINE_ID_LENGTH ? v : null

// Remote states are untrusted: anything of the wrong shape reads as "not there", and geometry is
// clamped to its range so a crafted value can't place a pointer outside its row (which would
// scroll the page sideways) or send a playhead racing off.
function readPointer(p: unknown): PointerState {
  if (typeof p !== 'object' || p === null) return null
  const o = p as Record<string, unknown>
  if (o.area === 'waveform' && finite(o.time)) return { area: 'waveform', time: Math.max(0, o.time) }
  const lineId = lineIdOf(o.lineId)
  if (o.area === 'lines' && lineId !== null && finite(o.xRatio) && finite(o.yRatio)) {
    return { area: 'lines', lineId, xRatio: clamp(o.xRatio, 0, 1), yRatio: clamp(o.yRatio, 0, 1) }
  }
  return null
}

function readPlayhead(p: unknown): PlayheadState | null {
  if (typeof p !== 'object' || p === null) return null
  const o = p as Record<string, unknown>
  return finite(o.t) && typeof o.playing === 'boolean' && finite(o.rate)
    ? { t: Math.max(0, o.t), playing: o.playing, rate: clamp(o.rate, 0, MAX_PLAYHEAD_RATE) }
    : null
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

const resolvePointer = (v: PointerInput): PointerState | undefined => (typeof v === 'function' ? v() : v)

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
  /**
   * Throttled to one update per 50 ms; the latest value always goes out. A function is called
   * only for the updates actually sent, so a caller can defer its layout reads to them.
   */
  setPointer: (p: PointerInput) => void
  /** Throttled to one update per 250 ms; the latest value always goes out. */
  setPlayhead: (p: PlayheadState | null) => void
  setActiveLine: (id: string | null) => void
  /** Duration in seconds of the media loaded locally, null when there is none. Not throttled. */
  setDuration: (d: number | null) => void
  /** Which view this tab shows. Not throttled. 'preview' and 'mobile' also clear and mute the pointer. */
  setView: (v: PresenceView | null) => void
}

type Setters = {
  pointer: ReturnType<typeof createThrottle<PointerInput>>
  playhead: ReturnType<typeof createThrottle<PlayheadState | null>>
  field: (key: LocalField, value: unknown) => void
}

function samePeer(a: CollabPeer, b: CollabPeer): boolean {
  return a.name === b.name && a.subject === b.subject && a.colorIndex === b.colorIndex && a.role === b.role && a.avatarUrl === b.avatarUrl && a.activeLineId === b.activeLineId
    && a.duration === b.duration && a.view === b.view && samePointer(a.pointer, b.pointer) && samePlayhead(a.playhead, b.playhead)
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
  const latest = useRef<Record<LocalField, unknown>>(emptyLocal())

  const name = me?.name ?? null
  const colorIndex = me?.colorIndex ?? null
  const role = me?.role ?? null
  const avatarUrl = me?.avatarUrl ?? null

  // Buffered values belong to the connection they were made for. A layout effect, because it must
  // run before any passive effect: children buffer their first values (the cursor line, the media
  // duration) in theirs while the identity is still unknown, and those must survive until it arrives.
  useLayoutEffect(() => {
    latest.current = emptyLocal()
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
    awareness.setLocalState({ ...latest.current, user: { name, colorIndex, role, avatarUrl } })

    const pointer = createThrottle<PointerInput>(POINTER_THROTTLE_MS, (v) => {
      // A trailing move made before switching to a pointerless view stays unsent.
      if (pointerless(latest.current.view)) return
      const p = resolvePointer(v)
      if (p !== undefined) field('pointer', p)
    })
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
          avatarUrl: typeof s.user.avatarUrl === 'string' ? s.user.avatarUrl : null,
          pointer: readPointer(s.pointer),
          playhead: playheadNow,
          activeLineId: lineIdOf(s.activeLineId),
          duration: finite(s.duration) && s.duration >= 0 ? s.duration : null,
          view: readView(s.view),
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
  }, [provider, name, colorIndex, role, avatarUrl])

  // Before the identity is known there is nobody to publish to: the value is kept and goes out with it.
  const setPointer = useCallback((p: PointerInput) => {
    if (pointerless(latest.current.view)) return
    if (setters.current) setters.current.pointer.push(p)
    else {
      const v = resolvePointer(p)
      if (v !== undefined) latest.current.pointer = v
    }
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
  const setView = useCallback((v: PresenceView | null) => {
    if (latest.current.view === v) return
    const set = setters.current
    if (set) set.field('view', v)
    else latest.current.view = v
    if (!pointerless(v)) return
    // Nothing to point at in this view: drop any queued move and clear the published pointer.
    set?.pointer.cancel()
    if (set) set.field('pointer', null)
    else latest.current.pointer = null
  }, [])

  // Peers of a connection that is gone (or has no identity yet) are not shown.
  const listed = provider && name !== null ? peers : NO_PEERS
  return useMemo(
    () => ({ peers: listed, setPointer, setPlayhead, setActiveLine, setDuration, setView }),
    [listed, setPointer, setPlayhead, setActiveLine, setDuration, setView],
  )
}
