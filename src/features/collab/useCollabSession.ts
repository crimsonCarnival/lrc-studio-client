import { useEffect, useState } from 'react'
import type { AuthorizedScope, HocuspocusProvider } from '@hocuspocus/provider'
import type * as Y from 'yjs'
import { useAuthContext } from '@/features/auth/useAuthContext'
import { getDeviceId } from '@/shared/utils/device'
import { getSession } from './collab.service'
import { loadCollabRuntime } from './load-collab-runtime'
import type { CollabMe, CollabRole, CollabStatus } from './collab.types'

export type CollabSessionState = {
  doc: Y.Doc | null
  provider: HocuspocusProvider | null
  status: CollabStatus
  me: CollabMe | null
  role: CollabRole | null
}

type Terminal = Extract<CollabStatus, 'ended' | 'forbidden'>

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

// Close codes and reasons from the server (task 3): 4401 unauthorized, 4403
// forbidden/kicked, 4410 session ended. 4409 (role changed) and 4413 (doc too
// large) mean "reconnect and re-authenticate", so they are not refusals.
// A Hocuspocus CLOSE message arrives as code 1000 carrying the same reason.
function refusalOf(code: number, reason: string): Terminal | null {
  if (code === 4410 || reason === 'session-ended' || reason === 'session_ended') return 'ended'
  if (code === 4401 || code === 4403 || reason === 'kicked' || reason === 'forbidden' || reason === 'unauthorized') return 'forbidden'
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

type Connection = { publicId: string; doc: Y.Doc; provider: HocuspocusProvider }

/**
 * Connects to the shared doc `project:<publicId>` while publicId is non-null.
 * Auth rides on cookies (access token or the guest cookie), so no token is sent.
 * A refusal or `{t:'session-ended'}` stops reconnecting for good.
 *
 * `me` is resolved for signed-in users from `collabSession`; guests cannot query
 * it, so for them `me` stays null and `role` comes from the authorized scope.
 */
export function useCollabSession(publicId: string | null): CollabSessionState {
  const { user } = useAuthContext()
  const userId = user && !user.isGuest && typeof user.id === 'string' ? user.id : null

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
          if (!terminal && s === rt.WebSocketStatus.Disconnected) setStatus('offline')
        },
        onSynced: ({ state }) => {
          if (!terminal && state) setStatus('synced')
        },
        onAuthenticated: ({ scope: granted }) => setScope(granted),
        onAuthenticationFailed: ({ reason }) => stop(reason === 'session_ended' ? 'ended' : 'forbidden'),
        onClose: ({ event }) => {
          const refusal = refusalOf(event.code, event.reason)
          if (refusal) stop(refusal)
        },
        onStateless: ({ payload }) => {
          if (isSessionEnded(payload)) stop('ended')
        },
      })
      setConn({ publicId, doc, provider })
    }).catch((err) => {
      // The runtime chunk failed to load (offline, or a deploy replaced it).
      console.error('[collab] could not start the session', err)
      if (!cancelled) setStatus('offline')
    })

    return () => {
      cancelled = true
      terminal = true
      provider?.destroy()
      doc?.destroy()
    }
  }, [publicId])

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
    status: active ? status : 'connecting',
    me,
    role: active ? role : null,
  }
}
