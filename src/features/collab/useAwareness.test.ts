import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CollabMe } from './collab.types'
import { PLAYHEAD_THROTTLE_MS, POINTER_THROTTLE_MS, extrapolate, useAwareness } from './useAwareness'

type State = Record<string, unknown>

// The slice of y-protocols' Awareness that useAwareness touches.
function fakeAwareness(clientID: number) {
  const states = new Map<number, State>()
  const handlers = new Map<string, ((arg?: unknown) => void)[]>()
  const emit = (event: string) => (handlers.get(event) ?? []).forEach((fn) => fn())
  const awareness = {
    clientID,
    getStates: () => states,
    getLocalState: () => states.get(clientID) ?? null,
    setLocalState: vi.fn((s: State | null) => {
      if (s === null) states.delete(clientID)
      else states.set(clientID, s)
      emit('change')
    }),
    setLocalStateField: vi.fn((key: string, value: unknown) => {
      states.set(clientID, { ...(states.get(clientID) ?? {}), [key]: value })
      emit('change')
    }),
    on: (event: string, fn: () => void) => handlers.set(event, [...(handlers.get(event) ?? []), fn]),
    off: (event: string, fn: () => void) => handlers.set(event, (handlers.get(event) ?? []).filter((f) => f !== fn)),
    remote(id: number, s: State | null) {
      if (s === null) states.delete(id)
      else states.set(id, s)
      emit('change')
    },
  }
  return awareness
}

const meWith = (over: Partial<CollabMe> = {}): CollabMe => ({
  subject: 'user:1', name: 'Ana', colorIndex: 2, role: 'editor', conn: 'c1', clientId: 1, ...over,
})
const luis = { name: 'Luis', colorIndex: 5, role: 'viewer' as const }

function setup(me: CollabMe | null = meWith()) {
  const awareness = fakeAwareness(1)
  const provider = { awareness }
  const hook = renderHook(() => useAwareness(provider as never, me))
  const fieldCalls = (key: string) => awareness.setLocalStateField.mock.calls.filter(([k]) => k === key).map(([, v]) => v)
  return { awareness, provider, hook, fieldCalls }
}

describe('extrapolate', () => {
  it('advances by rate when playing', () => {
    expect(extrapolate({ t: 10, playing: true, rate: 1.5 }, 1000, 3000)).toBeCloseTo(13)
  })

  it('holds when paused', () => {
    expect(extrapolate({ t: 10, playing: false, rate: 1 }, 1000, 9000)).toBe(10)
  })

  it('never runs backwards when the clocks disagree', () => {
    expect(extrapolate({ t: 10, playing: true, rate: 1 }, 5000, 4000)).toBe(10)
  })
})

describe('useAwareness', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('publishes the identity and initial fields once the server said who we are', () => {
    const { awareness } = setup()
    expect(awareness.getLocalState()).toEqual({
      user: { name: 'Ana', colorIndex: 2, role: 'editor' },
      pointer: null, playhead: null, activeLineId: null, duration: null,
    })
  })

  it('publishes nothing until it knows who we are', () => {
    const { awareness } = setup(null)
    expect(awareness.setLocalState).not.toHaveBeenCalled()
  })

  it('setPointer is throttled to one update per 50 ms with the trailing value kept', () => {
    const { hook, fieldCalls } = setup()
    const at = (xRatio: number) => ({ area: 'lines' as const, lineId: 'a', xRatio, yRatio: 0.5 })
    act(() => {
      hook.result.current.setPointer(at(0.1))
      hook.result.current.setPointer(at(0.2))
      hook.result.current.setPointer(at(0.3))
    })
    expect(fieldCalls('pointer')).toEqual([at(0.1)])
    act(() => { vi.advanceTimersByTime(POINTER_THROTTLE_MS) })
    expect(fieldCalls('pointer')).toEqual([at(0.1), at(0.3)])
    // Nothing further is queued once the trailing value went out.
    act(() => { vi.advanceTimersByTime(POINTER_THROTTLE_MS * 4) })
    expect(fieldCalls('pointer')).toHaveLength(2)
  })

  it('setPointer(null) after movement is the last thing sent', () => {
    const { hook, fieldCalls } = setup()
    act(() => {
      hook.result.current.setPointer({ area: 'waveform', time: 3 })
      hook.result.current.setPointer(null)
      vi.advanceTimersByTime(POINTER_THROTTLE_MS)
    })
    expect(fieldCalls('pointer').at(-1)).toBeNull()
  })

  it('setPlayhead is throttled to one update per 250 ms with the trailing value kept', () => {
    const { hook, fieldCalls } = setup()
    const at = (t: number) => ({ t, playing: true, rate: 1 })
    act(() => {
      hook.result.current.setPlayhead(at(1))
      vi.advanceTimersByTime(100)
      hook.result.current.setPlayhead(at(2))
      vi.advanceTimersByTime(100)
      hook.result.current.setPlayhead(at(3))
    })
    expect(fieldCalls('playhead')).toEqual([at(1)])
    act(() => { vi.advanceTimersByTime(PLAYHEAD_THROTTLE_MS) })
    expect(fieldCalls('playhead')).toEqual([at(1), at(3)])
  })

  it('setDuration and setActiveLine go out at once', () => {
    const { hook, fieldCalls } = setup()
    act(() => {
      hook.result.current.setDuration(212)
      hook.result.current.setDuration(null)
      hook.result.current.setActiveLine('l1')
    })
    expect(fieldCalls('duration')).toEqual([212, null])
    expect(fieldCalls('activeLineId')).toEqual(['l1'])
  })

  it('peers exclude self', () => {
    const { awareness, hook } = setup()
    act(() => awareness.remote(7, { user: luis }))
    expect(hook.result.current.peers.map((p) => p.clientId)).toEqual([7])
    expect(hook.result.current.peers.some((p) => p.clientId === awareness.clientID)).toBe(false)
  })

  it('skips peers that have not published a user', () => {
    const { awareness, hook } = setup()
    act(() => awareness.remote(7, { pointer: null }))
    expect(hook.result.current.peers).toEqual([])
  })

  it('exposes a peer\'s fields, including the media duration', () => {
    const { awareness, hook } = setup()
    const playhead = { t: 12, playing: true, rate: 1 }
    act(() => awareness.remote(7, { user: luis, playhead, activeLineId: 'l3', duration: 200, pointer: { area: 'waveform', time: 4 } }))
    expect(hook.result.current.peers[0]).toMatchObject({
      clientId: 7, name: 'Luis', colorIndex: 5, role: 'viewer', playhead, activeLineId: 'l3', duration: 200,
      pointer: { area: 'waveform', time: 4 },
    })
  })

  it('keeps a peer object and its receive time when only another peer changes', () => {
    const { awareness, hook } = setup()
    act(() => awareness.remote(7, { user: luis, playhead: { t: 1, playing: true, rate: 1 } }))
    const first = hook.result.current.peers[0]
    vi.advanceTimersByTime(1000)
    act(() => awareness.remote(8, { user: { name: 'Eva', colorIndex: 3, role: 'editor' } }))
    expect(hook.result.current.peers.find((p) => p.clientId === 7)).toBe(first)
  })

  it('does not restart extrapolation when a peer moves only its pointer', () => {
    const { awareness, hook } = setup()
    act(() => awareness.remote(7, { user: luis, playhead: { t: 1, playing: true, rate: 1 } }))
    const receivedAt = hook.result.current.peers[0].receivedAt
    vi.advanceTimersByTime(1000)
    // Remote states arrive re-decoded: same playhead values, new object.
    act(() => awareness.remote(7, { user: luis, playhead: { t: 1, playing: true, rate: 1 }, pointer: { area: 'waveform', time: 2 } }))
    expect(hook.result.current.peers[0].receivedAt).toBe(receivedAt)
  })

  it('drops a peer that leaves', () => {
    const { awareness, hook } = setup()
    act(() => awareness.remote(7, { user: luis }))
    act(() => awareness.remote(7, null))
    expect(hook.result.current.peers).toEqual([])
  })

  it('without a provider every setter is a no-op and nobody is listed', () => {
    const { result } = renderHook(() => useAwareness(null, meWith()))
    act(() => {
      result.current.setPointer({ area: 'waveform', time: 1 })
      result.current.setPlayhead({ t: 1, playing: false, rate: 1 })
      result.current.setActiveLine('x')
      result.current.setDuration(10)
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.peers).toEqual([])
  })

  it('on unmount clears timers and leaves the room', () => {
    const { awareness, hook, fieldCalls } = setup()
    act(() => {
      hook.result.current.setPointer({ area: 'waveform', time: 1 })
      hook.result.current.setPointer({ area: 'waveform', time: 2 })
    })
    hook.unmount()
    act(() => { vi.advanceTimersByTime(1000) })
    expect(fieldCalls('pointer')).toHaveLength(1)
    expect(awareness.getLocalState()).toBeNull()
  })
})
