import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { AuthorizedScope, HocuspocusProvider } from '@hocuspocus/provider'
import type * as Y from 'yjs'
import { useAuthContext } from '@/features/auth/useAuthContext'
import { getDeviceId } from '@/shared/utils/device'
import { authEvents } from '@/shared/utils/auth-events'
import type { ApiError } from '@/types'
import { getSession } from './collab.service'
import { loadCollabRuntime } from './load-collab-runtime'
import type { CollabMe, CollabRole, CollabStatus } from './collab.types'

export type CollabSessionState = {
  doc: Y.Doc | null
  provider: HocuspocusProvider | null
  status: CollabStatus
  me: CollabMe | null
  role: CollabRole | null
  /** Tears the connection down and starts over (reloading the runtime chunk if that failed). */
  retry: () => void
}

type Terminal = Extract<CollabStatus, 'ended' | 'forbidden'>
type Refusal = Terminal | 'unauthorized'

/**
 * WebSocket URL of the collab server. VITE_COLLAB_URL wins; otherwise the same
 * origin Socket.IO uses (socket.client.ts): VITE_SERVER_ORIGIN in production,
 * because the `/api` rewrite on the host does not carry WebSockets, and this
 * origin in development, where Vite proxies `/collab` with `ws: true`.
 * The server applies device bans from `deviceId`; browsers cannot set headers on a WebSocket.
 */
export function collabUrl(deviceId: string): string {
  const origin = import.meta.env.PROD ? import.meta.env.VITE_SERVER_ORIGIN : window.location.origin
  const base = import.meta.env.VITE_COLLAB_URL || `${(origin || '').replace(/\/+$/, '')}/collab`
  const url = new URL(base, window.location.href)
  if (url.protocol === 'http:') url.protocol = 'ws:'
  else if (url.protocol === 'https:') url.protocol = 'wss:'
  url.searchParams.set('deviceId', deviceId)
  return url.toString()
}

// Close codes and reasons from the server (task 3): 4401 unauthorized (no or an
// expired access cookie), 4403 forbidden/kicked, 4410 session ended. 4409 (role
// changed) and 4413 (doc too large) mean "reconnect and re-authenticate", so they
// are not refusals. A Hocuspocus CLOSE message arrives as code 1000 carrying the same reason.
function refusalOf(code: number, reason: string): Refusal | null {
  if (code === 4410 || reason === 'session-ended' || reason === 'session_ended') return 'ended'
  if (code === 4401 || reason === 'unauthorized') return 'unauthorized'
  if (code === 4403 || reason === 'kicked' || reason === 'forbidden') return 'forbidden'
  return null
}

function isSessionEnded(payload: string): boolean {
  try {
    const msg: unknown = JSON.parse(payload)
    return typeof msg === 'object' && msg !== null && (msg as { t?: unknown }).t === 'session-ended'
  } catch {
    return false
  }
}

// Delay before the single retry of a refresh that failed for a transient reason.
export const REFRESH_RETRY_DELAY_MS = 2000

// No HTTP status (network error) or a 5xx: worth one retry. A 4xx means the refresh
// token itself was refused.
function isTransientRefreshError(err: unknown): boolean {
  const status = (err as ApiError | null)?.status
  return !status || status >= 500
}

type Connection = { publicId: string; doc: Y.Doc; provider: HocuspocusProvider }

/**
 * Connects to the shared doc `project:<publicId>` while publicId is non-null.
 * Auth rides on cookies (access token or the guest cookie), so no token is sent.
 * A refusal or `{t:'session-ended'}` stops reconnecting for good, with one
 * exception: `unauthorized` from a signed-in user means the access cookie expired
 * (a tab that slept), so the session is refreshed and the socket reconnects once.
 * A second `unauthorized` in that attempt, a failed refresh, or a guest (nothing to
 * refresh) ends in 'forbidden'.
 *
 * `me` is resolved for signed-in users from `collabSession`; guests cannot query
 * it, so for them `me` stays null and `role` comes from the authorized scope.
 */
export function useCollabSession(publicId: string | null): CollabSessionState {
  const { user, refreshSession } = useAuthContext()
  const userId = user && !user.isGuest && typeof user.id === 'string' ? user.id : null
  // Read from provider callbacks, which live as long as the connection.
  const refreshRef = useRef<(() => Promise<void>) | null>(null)
  useLayoutEffect(() => {
    refreshRef.current = userId ? refreshSession : null
  })

  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  // publicId whose runtime chunk failed to load: there is no connection to report on.
  const [failedFor, setFailedFor] = useState<string | null>(null)
  const [conn, setConn] = useState<Connection | null>(null)
  const [status, setStatus] = useState<CollabStatus>('connecting')
  const [scope, setScope] = useState<AuthorizedScope | null>(null)
  const [me, setMe] = useState<CollabMe | null>(null)

  useEffect(() => {
    // Synchronising React state with an external system (the collab socket).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus('connecting')
    setScope(null)
    setConn(null)
    setFailedFor(null)
    if (!publicId) return

    let cancelled = false
    let terminal = false
    let provider: HocuspocusProvider | null = null
    let doc: Y.Doc | null = null

    const stop = (next: Terminal) => {
      if (terminal) return
      terminal = true
      // The provider owns its socket here, so this sets shouldConnect=false and
      // clears any pending reconnect timer.
      provider?.disconnect()
      setStatus(next)
    }

    // One refresh-and-reconnect per connection attempt; reset once authenticated.
    let refreshUsed = false
    let refreshing = false
    let refreshRetryTimer: ReturnType<typeof setTimeout> | null = null
    const onUnauthorized = () => {
      // The server reports one refusal twice (auth message, then the close): ignore the echo.
      if (terminal || refreshing) return
      const refresh = refreshRef.current
      if (!refresh || refreshUsed) return stop('forbidden')
      refreshUsed = true
      refreshing = true
      provider?.disconnect()
      const attempt = (retriesLeft: number): void => {
        refresh().then(
          () => {
            refreshing = false
            if (!terminal) void provider?.connect()
          },
          (err: unknown) => {
            if (terminal) return
            const transient = isTransientRefreshError(err)
            // A network blip or a 5xx gets one more try before giving up.
            if (transient && retriesLeft > 0) {
              refreshRetryTimer = setTimeout(() => attempt(retriesLeft - 1), REFRESH_RETRY_DELAY_MS)
              return
            }
            refreshing = false
            stop('forbidden')
            // A dead refresh token is the app's "session expired" case: hand it to the
            // global token:expired handler (sign out, toast, redirect to sign-in).
            if (!transient) authEvents.emit('token:expired')
          },
        )
      }
      attempt(1)
    }
    const refuse = (refusal: Refusal) => (refusal === 'unauthorized' ? onUnauthorized() : stop(refusal))

    // yjs and the provider load here, on the first session only (see collab-runtime.ts).
    void Promise.all([loadCollabRuntime(), getDeviceId()]).then(([rt, deviceId]) => {
      if (cancelled) return
      doc = new rt.Doc()
      provider = new rt.HocuspocusProvider({
        url: collabUrl(deviceId),
        name: `project:${publicId}`,
        document: doc,
        token: null,
        onStatus: ({ status: s }) => {
          // A deliberate disconnect to refresh the session is not "offline".
          if (!terminal && !refreshing && s === rt.WebSocketStatus.Disconnected) setStatus('offline')
        },
        onSynced: ({ state }) => {
          if (!terminal && state) setStatus('synced')
        },
        onAuthenticated: ({ scope: granted }) => {
          refreshUsed = false
          setScope(granted)
        },
        onAuthenticationFailed: ({ reason }) => refuse(refusalOf(0, reason) ?? 'forbidden'),
        onClose: ({ event }) => {
          const refusal = refusalOf(event.code, event.reason)
          if (refusal) refuse(refusal)
        },
        onStateless: ({ payload }) => {
          if (isSessionEnded(payload)) stop('ended')
        },
      })
      setConn({ publicId, doc, provider })
    }).catch((err) => {
      // The runtime chunk failed to load (offline, or a deploy replaced it).
      console.error('[collab] could not start the session', err)
      if (!cancelled) setFailedFor(publicId)
    })

    return () => {
      cancelled = true
      terminal = true
      if (refreshRetryTimer) clearTimeout(refreshRetryTimer)
      provider?.destroy()
      doc?.destroy()
    }
  }, [publicId, attempt])

  const active = conn && conn.publicId === publicId ? conn : null

  // Who am I: re-read after every (re)authentication, so a role change shows up.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMe(null)
    if (!active || !scope || !userId) return
    let cancelled = false
    const subject = `user:${userId}`
    getSession(active.publicId)
      .then((session) => {
        const member = session?.members.find((m) => m.subject === subject)
        if (cancelled || !member) return
        setMe({ subject, name: member.name, colorIndex: member.colorIndex, role: member.role, clientId: active.doc.clientID })
      })
      .catch((err) => console.error('[collab] could not resolve the current participant', err))
    return () => { cancelled = true }
  }, [active, scope, userId])

  const role: CollabRole | null = me?.role ?? (scope === 'readonly' ? 'viewer' : scope === 'read-write' ? 'editor' : null)

  return {
    doc: active?.doc ?? null,
    provider: active?.provider ?? null,
    status: active ? status : failedFor !== null && failedFor === publicId ? 'offline' : 'connecting',
    me,
    role: active ? role : null,
    retry,
  }
}
