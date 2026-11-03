import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type ProviderConfig = {
  onAuthenticated: (p: { scope: string }) => void
  onAuthenticationFailed: (p: { reason: string }) => void
  onClose: (p: { event: { code: number; reason: string } }) => void
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
vi.mock('./collab.service', () => ({ getSession: () => Promise.resolve(null) }))

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

  it('a transient refresh failure is retried once after a delay, then reconnects', async () => {
    try {
      const refresh = vi.fn()
        .mockImplementationOnce(() => Promise.reject(Object.assign(new Error('bad gateway'), { status: 502 })))
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
