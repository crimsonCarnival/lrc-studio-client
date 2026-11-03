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

import { useCollabSession } from './useCollabSession'

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

  it('a failed refresh becomes forbidden without reconnecting', async () => {
    h.auth.refreshSession = vi.fn(() => Promise.reject(new Error('refresh dead')))
    const { result, provider } = await connected()

    act(() => provider.config.onClose({ event: { code: 4401, reason: 'unauthorized' } }))
    await flush()
    expect(result.current.status).toBe('forbidden')
    expect(provider.connect).not.toHaveBeenCalled()
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
