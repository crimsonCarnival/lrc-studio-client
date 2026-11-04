import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type ProviderConfig = {
  onAuthenticated: (p: { scope: string }) => void
  onAuthenticationFailed: (p: { reason: string }) => void
  onClose: (p: { event: { code: number; reason: string } }) => void
  onStateless: (p: { payload: string }) => void
  onStatus: (p: { status: string }) => void
}

const h = vi.hoisted(() => ({
  providers: [] as { config: ProviderConfig; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[],
  auth: { user: null as { id: string; isGuest?: boolean } | null, refreshSession: (() => Promise.resolve()) as () => Promise<void> },
}))

vi.mock('@hocuspocus/provider', () => {
  class HocuspocusProvider {
    config: ProviderConfig
    connect = vi.fn(async () => {})
    disconnect = vi.fn()
    destroy = vi.fn()
    constructor(config: ProviderConfig) {
      this.config = config
      h.providers.push(this)
    }
  }
  return { HocuspocusProvider, WebSocketStatus: { Connecting: 'connecting', Connected: 'connected', Disconnected: 'disconnected' } }
})
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => h.auth }))
vi.mock('@/shared/utils/device', () => ({ getDeviceId: () => Promise.resolve('dv_test') }))

import { authEvents } from '@/shared/utils/auth-events'
import { REFRESH_RETRY_DELAY_MS, useCollabSession } from './useCollabSession'

async function connected() {
  const hook = renderHook(() => useCollabSession('abc123'))
  await waitFor(() => expect(h.providers).toHaveLength(1))
  return { ...hook, provider: h.providers[0] }
}

// Lets a resolved refresh promise run its continuation.
const flush = () => act(async () => { await Promise.resolve() })

describe('useCollabSession: unauthorized handling', () => {
  beforeEach(() => {
    h.providers.length = 0
    h.auth.user = { id: 'u1' }
  })

  it('refreshes the session and reconnects once after a 4401 close', async () => {
    const refresh = vi.fn(() => Promise.resolve())
    h.auth.refreshSession = refresh
    const { result, provider } = await connected()

    act(() => provider.config.onClose({ event: { code: 4401, reason: 'unauthorized' } }))
    expect(provider.disconnect).toHaveBeenCalledTimes(1)
    expect(refresh).toHaveBeenCalledTimes(1)
    await flush()
    expect(provider.connect).toHaveBeenCalledTimes(1)
    expect(result.current.status).not.toBe('forbidden')
  })

  it('treats the auth-failed message and its close echo as one refusal', async () => {
    const refresh = vi.fn(() => Promise.resolve())
    h.auth.refreshSession = refresh
    const { result, provider } = await connected()

    act(() => {
      provider.config.onAuthenticationFailed({ reason: 'unauthorized' })
      provider.config.onClose({ event: { code: 4401, reason: 'unauthorized' } })
    })
    await flush()
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(provider.connect).toHaveBeenCalledTimes(1)
    expect(result.current.status).not.toBe('forbidden')
  })

  it('a second unauthorized after the reconnect becomes forbidden', async () => {
    const refresh = vi.fn(() => Promise.resolve())
    h.auth.refreshSession = refresh
    const { result, provider } = await connected()

    act(() => provider.config.onAuthenticationFailed({ reason: 'unauthorized' }))
    await flush()
    act(() => provider.config.onAuthenticationFailed({ reason: 'unauthorized' }))
    expect(result.current.status).toBe('forbidden')
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(provider.connect).toHaveBeenCalledTimes(1)
  })

  it('allows a fresh refresh once a reconnect authenticated', async () => {
    const refresh = vi.fn(() => Promise.resolve())
    h.auth.refreshSession = refresh
    const { result, provider } = await connected()

    act(() => provider.config.onClose({ event: { code: 4401, reason: 'unauthorized' } }))
    await flush()
    act(() => provider.config.onAuthenticated({ scope: 'read-write' }))
    act(() => provider.config.onClose({ event: { code: 4401, reason: 'unauthorized' } }))
    await flush()
    expect(refresh).toHaveBeenCalledTimes(2)
    expect(provider.connect).toHaveBeenCalledTimes(2)
    expect(result.current.status).not.toBe('forbidden')
  })

  it('a dead refresh token becomes forbidden and goes through the session-expired path', async () => {
    h.auth.refreshSession = vi.fn(() => Promise.reject(Object.assign(new Error('refresh dead'), { status: 401 })))
    const expired = vi.fn()
    const unsub = authEvents.on('token:expired', expired)
    const { result, provider } = await connected()

    act(() => provider.config.onClose({ event: { code: 4401, reason: 'unauthorized' } }))
    await flush()
    unsub()
    expect(result.current.status).toBe('forbidden')
    expect(provider.connect).not.toHaveBeenCalled()
    expect(expired).toHaveBeenCalledTimes(1)
  })

  it.each([502, 429, 408])('a transient refresh failure (%i) is retried once after a delay, then reconnects', async (status) => {
    try {
      const refresh = vi.fn()
        .mockImplementationOnce(() => Promise.reject(Object.assign(new Error('transient'), { status })))
        .mockImplementation(() => Promise.resolve())
      h.auth.refreshSession = refresh
      const { result, provider } = await connected()
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

      act(() => provider.config.onClose({ event: { code: 4401, reason: 'unauthorized' } }))
      await flush()
      expect(refresh).toHaveBeenCalledTimes(1)
      expect(provider.connect).not.toHaveBeenCalled()
      await act(async () => { vi.advanceTimersByTime(REFRESH_RETRY_DELAY_MS) })
      await flush()
      expect(refresh).toHaveBeenCalledTimes(2)
      expect(provider.connect).toHaveBeenCalledTimes(1)
      expect(result.current.status).not.toBe('forbidden')
    } finally {
      vi.useRealTimers()
    }
  })

  it('two transient failures in a row become forbidden without signing out', async () => {
    const expired = vi.fn()
    const unsub = authEvents.on('token:expired', expired)
    try {
      h.auth.refreshSession = vi.fn(() => Promise.reject(new Error('network down')))
      const { result, provider } = await connected()
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

      act(() => provider.config.onClose({ event: { code: 4401, reason: 'unauthorized' } }))
      await flush()
      await act(async () => { vi.advanceTimersByTime(REFRESH_RETRY_DELAY_MS) })
      await flush()
      expect(result.current.status).toBe('forbidden')
      expect(provider.connect).not.toHaveBeenCalled()
      expect(expired).not.toHaveBeenCalled()
    } finally {
      unsub()
      vi.useRealTimers()
    }
  })

  it('a guest has nothing to refresh: unauthorized is terminal', async () => {
    h.auth.user = null
    const refresh = vi.fn(() => Promise.resolve())
    h.auth.refreshSession = refresh
    const { result, provider } = await connected()

    act(() => provider.config.onAuthenticationFailed({ reason: 'unauthorized' }))
    expect(result.current.status).toBe('forbidden')
    expect(refresh).not.toHaveBeenCalled()
    expect(provider.disconnect).toHaveBeenCalledTimes(1)
  })

  it('kicked and session-ended stay terminal for signed-in users', async () => {
    const refresh = vi.fn(() => Promise.resolve())
    h.auth.refreshSession = refresh
    const { result, provider } = await connected()
    act(() => provider.config.onClose({ event: { code: 1000, reason: 'session-ended' } }))
    expect(result.current.status).toBe('ended')
    expect(refresh).not.toHaveBeenCalled()
  })
})

describe('useCollabSession: hello and locks', () => {
  beforeEach(() => {
    h.providers.length = 0
    h.auth.user = null // a guest: the old signed-in-only lookup would never have resolved `me`
  })

  const hello = { t: 'hello', conn: 'conn-1', subject: 'guest:g1', name: 'Guest', colorIndex: 3, role: 'editor' }
  const say = (provider: { config: ProviderConfig }, msg: object) => act(() => provider.config.onStateless({ payload: JSON.stringify(msg) }))

  it('takes me from the hello message, guests included', async () => {
    const { result, provider } = await connected()
    expect(result.current.me).toBeNull()
    say(provider, hello)
    expect(result.current.me).toMatchObject({ subject: 'guest:g1', name: 'Guest', colorIndex: 3, role: 'editor', conn: 'conn-1' })
    expect(typeof result.current.me?.clientId).toBe('number')
    expect(result.current.role).toBe('editor')
  })

  it('a new hello after a reconnect replaces me', async () => {
    const { result, provider } = await connected()
    say(provider, hello)
    say(provider, { ...hello, conn: 'conn-2', role: 'viewer' })
    expect(result.current.me?.conn).toBe('conn-2')
    expect(result.current.role).toBe('viewer')
  })

  it('keeps the latest locks snapshot and clears it on disconnect', async () => {
    const { result, provider } = await connected()
    const holder = { holderConn: 'conn-9', subject: 'user:2', name: 'Luis', colorIndex: 5 }
    say(provider, { t: 'locks', locks: { l1: holder } })
    expect(result.current.locks).toEqual({ l1: holder })

    // An unchanged holder keeps its identity, so memoised rows skip the re-render.
    const before = result.current.locks.l1
    say(provider, { t: 'locks', locks: { l1: { ...holder }, l2: { ...holder } } })
    expect(result.current.locks.l1).toBe(before)

    act(() => provider.config.onStatus({ status: 'disconnected' }))
    expect(result.current.locks).toEqual({})
  })

  it('ignores malformed and unknown stateless messages', async () => {
    const { result, provider } = await connected()
    act(() => provider.config.onStateless({ payload: 'not json' }))
    say(provider, { t: 'hello', conn: 1 })
    say(provider, { t: 'something-else' })
    expect(result.current.me).toBeNull()
    expect(result.current.locks).toEqual({})
  })

  it('session-ended is still terminal and drops the locks', async () => {
    const { result, provider } = await connected()
    say(provider, { t: 'locks', locks: { l1: { holderConn: 'c', subject: 's', name: 'n', colorIndex: 1 } } })
    say(provider, { t: 'session-ended' })
    expect(result.current.status).toBe('ended')
    expect(result.current.locks).toEqual({})
  })

  it('receiving kicked stateless message for own subject is terminal and sets status to forbidden', async () => {
    const { result, provider } = await connected()
    say(provider, hello)
    expect(result.current.me?.subject).toBe('guest:g1')
    expect(result.current.status).not.toBe('forbidden')

    say(provider, { t: 'kicked', subject: 'guest:g1' })
    expect(result.current.status).toBe('forbidden')
    expect(provider.disconnect).toHaveBeenCalled()
  })

  it('receiving kicked stateless message for a different subject does not affect own session', async () => {
    const { result, provider } = await connected()
    say(provider, hello)
    expect(result.current.me?.subject).toBe('guest:g1')

    say(provider, { t: 'kicked', subject: 'guest:other' })
    expect(result.current.status).not.toBe('forbidden')
  })
})
