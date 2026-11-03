import { act, renderHook } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import type { CollabMe, LockSnapshot } from './collab.types'

const h = vi.hoisted(() => ({ error: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { error: h.error } }))

import { HEARTBEAT_MS, HIDDEN_RELEASE_MS, QUEUE_DEADLINE_MS, otherLockHolder, useLineLocks } from './useLineLocks'

type Sent = { t: string; lineId?: string; lineIds?: string[] }

// Just the provider surface useLineLocks touches: stateless in/out and status events.
function fakeProvider(lineIds: string[] = []) {
  const document = new Y.Doc()
  lineIds.forEach((id) => document.getMap('lines').set(id, true))
  const handlers = new Map<string, ((arg: unknown) => void)[]>()
  const sent: Sent[] = []
  return {
    sent,
    document,
    addLine(id: string) { document.getMap('lines').set(id, true) },
    on(event: string, fn: (arg: unknown) => void) { handlers.set(event, [...(handlers.get(event) ?? []), fn]) },
    off(event: string, fn: (arg: unknown) => void) { handlers.set(event, (handlers.get(event) ?? []).filter((f) => f !== fn)) },
    sendStateless(payload: string) { sent.push(JSON.parse(payload) as Sent) },
    emit(event: string, arg: unknown) { (handlers.get(event) ?? []).forEach((fn) => fn(arg)) },
    denied(lineId: string) { this.emit('stateless', { payload: JSON.stringify({ t: 'lock-denied', lineId }) }) },
    disconnected() { this.emit('status', { status: 'disconnected' }) },
    count: (event: string) => (handlers.get(event) ?? []).length,
  }
}
type FakeProvider = ReturnType<typeof fakeProvider>

const meWith = (conn: string): CollabMe => ({ subject: 'user:1', name: 'Ana', colorIndex: 2, role: 'editor', conn, clientId: 1 })
const mine = (conn: string) => ({ holderConn: conn, subject: 'user:1', name: 'Ana', colorIndex: 2 })
const theirs = { holderConn: 'other', subject: 'user:2', name: 'Luis', colorIndex: 5 }
const NONE: LockSnapshot = {}

// The doc already holds the lines the tests name, as it does once they have synced.
const LINES = ['l1', 'l2', 'l9', 'a', 'b', 'c', 'mark-line', 'editing-line']

function setup(initial: { me?: CollabMe | null; locks?: LockSnapshot } = {}) {
  const provider = fakeProvider(LINES)
  const hook = renderHook(
    (p: { me: CollabMe | null; locks: LockSnapshot }) => useLineLocks(provider as never, p.me, p.locks),
    { initialProps: { me: initial.me === undefined ? meWith('c1') : initial.me, locks: initial.locks ?? NONE } },
  )
  const locksOf = (p: FakeProvider = provider) => p.sent.filter((m) => m.t === 'lock').map((m) => m.lineId)
  return { provider, hook, locksOf }
}

describe('useLineLocks', () => {
  beforeEach(() => h.error.mockClear())
  afterEach(() => vi.useRealTimers())

  it('runs the write immediately without a session', () => {
    const { result } = renderHook(() => useLineLocks(null, null, NONE))
    const write = vi.fn()
    result.current.withLock('l1', write)
    expect(write).toHaveBeenCalledTimes(1)
    expect(result.current.isLockedByOther('l1')).toBe(false)
  })

  it('write runs immediately when held', () => {
    const { hook, provider } = setup({ locks: { l1: mine('c1') } })
    const write = vi.fn()
    act(() => hook.result.current.withLock('l1', write))
    expect(write).toHaveBeenCalledTimes(1)
    expect(provider.sent.filter((m) => m.t === 'lock')).toEqual([])
  })

  it('write waits for the grant, then runs with the originally captured value', () => {
    const { hook, locksOf } = setup()
    const out: number[] = []
    let time = 12.34
    act(() => hook.result.current.withLock('l1', ((captured) => () => out.push(captured))(time)))
    time = 99 // the clock moves on while the grant is in flight
    expect(out).toEqual([])
    expect(locksOf()).toEqual(['l1'])

    hook.rerender({ me: meWith('c1'), locks: { l1: mine('c1') } })
    expect(out).toEqual([12.34])
    expect(time).toBe(99)
    // Queued once, run once.
    hook.rerender({ me: meWith('c1'), locks: { l1: mine('c1') } })
    expect(out).toEqual([12.34])
  })

  it('several queued writes share one lock request and run in order', () => {
    const { hook, locksOf } = setup()
    const out: string[] = []
    act(() => {
      hook.result.current.withLock('l1', () => out.push('a'))
      hook.result.current.withLock('l1', () => out.push('b'))
    })
    expect(locksOf()).toEqual(['l1'])
    hook.rerender({ me: meWith('c1'), locks: { l1: mine('c1') } })
    expect(out).toEqual(['a', 'b'])
  })

  it('deny drops the write and names the holder', () => {
    const { hook, provider } = setup({ locks: { l1: theirs } })
    const write = vi.fn()
    act(() => hook.result.current.withLock('l1', write))
    act(() => provider.denied('l1'))
    expect(write).not.toHaveBeenCalled()
    expect(h.error).toHaveBeenCalledTimes(1)
    expect(h.error.mock.calls[0][0]).toContain('Luis')

    // A later grant must not resurrect the dropped write.
    hook.rerender({ me: meWith('c1'), locks: { l1: mine('c1') } })
    expect(write).not.toHaveBeenCalled()
  })

  it('tells the caller which line was denied', () => {
    const provider = fakeProvider(LINES)
    const onDenied = vi.fn()
    renderHook(() => useLineLocks(provider as never, meWith('c1'), NONE, { onDenied }))
    act(() => provider.denied('l9'))
    expect(onDenied).toHaveBeenCalledWith('l9')
  })

  it('isLockedByOther compares the holder connection, not the user', () => {
    const { hook } = setup({ locks: { a: mine('c1'), b: { ...mine('c2') }, c: theirs } })
    expect(hook.result.current.isLockedByOther('a')).toBe(false)
    // Same user, another tab: still somebody else.
    expect(hook.result.current.isLockedByOther('b')).toBe(true)
    expect(hook.result.current.isLockedByOther('c')).toBe(true)
    expect(hook.result.current.isLockedByOther('free')).toBe(false)
    expect(Object.keys(hook.result.current.othersLocks).sort()).toEqual(['b', 'c'])
  })

  it('claim and release send lock/unlock once per holder', () => {
    const { hook, provider } = setup()
    act(() => { hook.result.current.claim('l1'); hook.result.current.claim('l1') })
    expect(provider.sent.filter((m) => m.t === 'lock')).toHaveLength(1)
    hook.rerender({ me: meWith('c1'), locks: { l1: mine('c1') } })
    act(() => { hook.result.current.release('l1'); hook.result.current.release('l1') })
    expect(provider.sent.filter((m) => m.t === 'unlock')).toEqual([{ t: 'unlock', lineId: 'l1' }])
  })

  it('claims on one line are counted, so two reasons to hold it do not release each other', () => {
    const { hook, provider } = setup({ locks: { l1: mine('c1') } })
    act(() => { hook.result.current.claim('l1'); hook.result.current.claim('l1') })
    act(() => hook.result.current.release('l1'))
    expect(provider.sent.filter((m) => m.t === 'unlock')).toEqual([])
    act(() => hook.result.current.release('l1'))
    expect(provider.sent.filter((m) => m.t === 'unlock')).toHaveLength(1)
  })

  it('a release while a write is queued waits until the write has run', () => {
    const { hook, provider } = setup()
    const out: string[] = []
    act(() => {
      hook.result.current.claim('l1')
      hook.result.current.withLock('l1', () => out.push('mark'))
      hook.result.current.release('l1') // the cursor moved on before the grant
    })
    expect(provider.sent.filter((m) => m.t === 'unlock')).toEqual([])
    hook.rerender({ me: meWith('c1'), locks: { l1: mine('c1') } })
    expect(out).toEqual(['mark'])
    expect(provider.sent.filter((m) => m.t === 'unlock')).toEqual([{ t: 'unlock', lineId: 'l1' }])
  })

  it('disconnect clears held and pending', () => {
    const { hook, provider } = setup()
    const write = vi.fn()
    act(() => hook.result.current.withLock('l1', write))
    act(() => provider.disconnected())
    // The server freed this connection's locks; a late snapshot naming a new
    // connection must not run the dropped write.
    hook.rerender({ me: meWith('c2'), locks: { l1: mine('c2') } })
    expect(write).not.toHaveBeenCalled()
  })

  it('a write made while disconnected is dropped, not replayed after the reconnect', () => {
    const { hook, provider, locksOf } = setup()
    act(() => provider.disconnected())
    provider.sent.length = 0
    const write = vi.fn()
    act(() => hook.result.current.withLock('l1', write))
    expect(write).not.toHaveBeenCalled()
    expect(h.error).toHaveBeenCalledTimes(1)

    hook.rerender({ me: meWith('c2'), locks: NONE }) // hello after the reconnect
    expect(locksOf()).toEqual([])
    hook.rerender({ me: meWith('c2'), locks: { l1: mine('c2') } })
    expect(write).not.toHaveBeenCalled()
  })

  it('lets go of a lock taken only for a queued write once it has run', () => {
    const { hook, provider } = setup()
    const write = vi.fn()
    act(() => hook.result.current.withLock('l1', write)) // no claim: nothing keeps the line
    hook.rerender({ me: meWith('c1'), locks: { l1: mine('c1') } })
    expect(write).toHaveBeenCalledTimes(1)
    expect(provider.sent.filter((m) => m.t === 'unlock')).toEqual([{ t: 'unlock', lineId: 'l1' }])
    // The server's follow-up snapshot no longer lists it, so no heartbeat keeps it alive.
    hook.rerender({ me: meWith('c1'), locks: NONE })
    vi.useFakeTimers()
    provider.sent.length = 0
    act(() => { vi.advanceTimersByTime(HEARTBEAT_MS) })
    expect(provider.sent).toEqual([])
  })

  it('keeps the lock after a queued write when the line is still claimed', () => {
    const { hook, provider } = setup()
    act(() => { hook.result.current.claim('l1'); hook.result.current.withLock('l1', vi.fn()) })
    hook.rerender({ me: meWith('c1'), locks: { l1: mine('c1') } })
    expect(provider.sent.filter((m) => m.t === 'unlock')).toEqual([])
  })

  it('sends no lock for a line the local doc does not have yet, then sends it once it appears', () => {
    const { hook, provider, locksOf } = setup()
    act(() => hook.result.current.claim('fresh'))
    expect(locksOf()).toEqual([])
    act(() => provider.addLine('fresh'))
    expect(locksOf()).toEqual(['fresh'])
    act(() => provider.addLine('other')) // later doc updates don't resend
    expect(locksOf()).toEqual(['fresh'])
  })

  it('a release while waiting for the line cancels the request', () => {
    const { hook, provider, locksOf } = setup()
    act(() => hook.result.current.claim('fresh'))
    act(() => hook.result.current.release('fresh'))
    act(() => provider.addLine('fresh'))
    expect(locksOf()).toEqual([])
  })

  it('reconnect reclaims only the line in an open editor', () => {
    const { hook, provider, locksOf } = setup()
    act(() => {
      hook.result.current.withLock('mark-line', vi.fn()) // a mark waiting for its grant
      hook.result.current.claim('editing-line') // an open text editor
    })
    act(() => provider.disconnected())
    provider.sent.length = 0

    hook.rerender({ me: meWith('c2'), locks: NONE }) // new hello after the reconnect
    expect(locksOf()).toEqual(['editing-line'])
  })

  it('claims made before the hello are sent when it arrives', () => {
    const { hook, provider, locksOf } = setup({ me: null })
    act(() => hook.result.current.claim('l1'))
    expect(provider.sent).toEqual([])
    hook.rerender({ me: meWith('c1'), locks: NONE })
    expect(locksOf()).toEqual(['l1'])
  })

  it('heartbeats held lines every 10s and stops on unmount', () => {
    vi.useFakeTimers()
    const { hook, provider } = setup({ locks: { l1: mine('c1'), l2: theirs } })
    act(() => { vi.advanceTimersByTime(HEARTBEAT_MS) })
    expect(provider.sent.filter((m) => m.t === 'heartbeat')).toEqual([{ t: 'heartbeat', lineIds: ['l1'] }])

    hook.unmount()
    provider.sent.length = 0
    act(() => { vi.advanceTimersByTime(HEARTBEAT_MS * 3) })
    expect(provider.sent).toEqual([])
    expect(provider.count('stateless')).toBe(0)
    expect(provider.count('status')).toBe(0)
  })

  // B1: the editor's claim effects release after this hook's own cleanup has run, so the
  // teardown itself has to let go of what this connection holds.
  it('unmount releases held and requested lines', () => {
    const provider = fakeProvider(LINES)
    const hook = renderHook(
      (p: { locks: LockSnapshot }) => {
        const locks = useLineLocks(provider as never, meWith('c1'), p.locks)
        const { claim, release } = locks
        // Declared after the hook, like useEditor's claim effects.
        useEffect(() => { claim('l1'); return () => release('l1') }, [claim, release])
        useEffect(() => { claim('l2'); return () => release('l2') }, [claim, release])
        return locks
      },
      { initialProps: { locks: NONE } },
    )
    hook.rerender({ locks: { l1: mine('c1') } }) // l1 granted, l2 still in flight
    provider.sent.length = 0
    hook.unmount()
    const unlocks = provider.sent.filter((m) => m.t === 'unlock').map((m) => m.lineId).sort()
    expect(unlocks).toEqual(['l1', 'l2'])
  })

  // B2a: a force-unlock (or idle expiry) must not leave a stale request behind that
  // swallows the next one.
  it('after a force-unlock a tap asks for the lock again and the write runs on the re-grant', () => {
    const { hook, locksOf } = setup()
    act(() => hook.result.current.claim('l1'))
    hook.rerender({ me: meWith('c1'), locks: { l1: mine('c1') } })
    hook.rerender({ me: meWith('c1'), locks: NONE }) // the owner force-unlocked it
    const write = vi.fn()
    act(() => hook.result.current.withLock('l1', write))
    expect(locksOf()).toEqual(['l1', 'l1'])
    hook.rerender({ me: meWith('c1'), locks: { l1: mine('c1') } })
    expect(write).toHaveBeenCalledTimes(1)
  })

  // B2b: a queued write never waits forever.
  it('drops a queued write with the deny toast when no grant arrives in time', () => {
    vi.useFakeTimers()
    const { hook, provider } = setup()
    const write = vi.fn()
    act(() => hook.result.current.withLock('l1', write))
    act(() => { vi.advanceTimersByTime(QUEUE_DEADLINE_MS - 1) })
    expect(h.error).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(h.error).toHaveBeenCalledTimes(1)
    // Nothing wants the line any more: the in-flight request is cancelled...
    expect(provider.sent.filter((m) => m.t === 'unlock')).toEqual([{ t: 'unlock', lineId: 'l1' }])
    // ...and a late grant does not resurrect the write.
    hook.rerender({ me: meWith('c1'), locks: { l1: mine('c1') } })
    expect(write).not.toHaveBeenCalled()
  })

  it('drops a write waiting for a line that never arrives', () => {
    vi.useFakeTimers()
    const { hook, provider, locksOf } = setup()
    const write = vi.fn()
    act(() => hook.result.current.withLock('ghost', write))
    act(() => { vi.advanceTimersByTime(QUEUE_DEADLINE_MS) })
    expect(h.error).toHaveBeenCalledTimes(1)
    act(() => provider.addLine('ghost'))
    expect(locksOf()).toEqual([])
    hook.rerender({ me: meWith('c1'), locks: { ghost: mine('c1') } })
    expect(write).not.toHaveBeenCalled()
  })

  // B5: a background tab stops heartbeating and lets go after a while.
  describe('while the tab is hidden', () => {
    let visibility: DocumentVisibilityState = 'visible'
    beforeEach(() => {
      visibility = 'visible'
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
    })
    afterEach(() => {
      Reflect.deleteProperty(document, 'visibilityState')
    })
    const setVisibility = (v: DocumentVisibilityState) => {
      visibility = v
      act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    }

    it('pauses the heartbeat, releases after 30s and re-claims only the wanted lines on return', () => {
      vi.useFakeTimers()
      const { hook, provider, locksOf } = setup()
      act(() => hook.result.current.claim('editing-line'))
      hook.rerender({ me: meWith('c1'), locks: { 'editing-line': mine('c1'), l9: mine('c1') } })
      provider.sent.length = 0

      setVisibility('hidden')
      act(() => { vi.advanceTimersByTime(HEARTBEAT_MS) })
      expect(provider.sent.filter((m) => m.t === 'heartbeat')).toEqual([])

      act(() => { vi.advanceTimersByTime(HIDDEN_RELEASE_MS - HEARTBEAT_MS) })
      const unlocks = provider.sent.filter((m) => m.t === 'unlock').map((m) => m.lineId).sort()
      expect(unlocks).toEqual(['editing-line', 'l9'])

      hook.rerender({ me: meWith('c1'), locks: NONE })
      provider.sent.length = 0
      setVisibility('visible')
      expect(locksOf()).toEqual(['editing-line'])
    })

    it('a short trip to another tab keeps the locks', () => {
      vi.useFakeTimers()
      const { hook, provider } = setup()
      act(() => hook.result.current.claim('editing-line'))
      hook.rerender({ me: meWith('c1'), locks: { 'editing-line': mine('c1') } })
      provider.sent.length = 0
      setVisibility('hidden')
      act(() => { vi.advanceTimersByTime(HIDDEN_RELEASE_MS - 1) })
      setVisibility('visible')
      act(() => { vi.advanceTimersByTime(HIDDEN_RELEASE_MS) })
      expect(provider.sent.filter((m) => m.t === 'unlock')).toEqual([])
      expect(provider.sent.filter((m) => m.t === 'heartbeat').length).toBeGreaterThan(0)
    })
  })
})

// B4: whole-document replaces refuse while anyone else holds a line.
describe('otherLockHolder', () => {
  it('finds a line held by another connection, the same user in another tab included', () => {
    expect(otherLockHolder({ a: mine('c1'), b: theirs }, 'c1')).toEqual(theirs)
    expect(otherLockHolder({ a: mine('c2') }, 'c1')).toEqual(mine('c2'))
  })

  it('is null when only this connection holds lines, or nobody does', () => {
    expect(otherLockHolder({ a: mine('c1') }, 'c1')).toBeNull()
    expect(otherLockHolder(NONE, 'c1')).toBeNull()
    expect(otherLockHolder(NONE, null)).toBeNull()
  })
})
