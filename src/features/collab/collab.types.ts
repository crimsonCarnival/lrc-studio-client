import type { HocuspocusProvider } from '@hocuspocus/provider'
import type { EditorLine } from '../editor/editor.types'

export type CollabRole = 'owner' | 'editor' | 'viewer'

/** Mirrors the server's CollabMeta (the shared Y.Doc `meta` map). */
export type CollabMeta = {
  editorMode: 'lrc' | 'srt' | 'words'
  title: string | null
  artist: string | null
  album: string | null
  media: {
    source: 'cloudinary' | 'youtube' | null
    url: string | null
    uploadId: string | null
  }
}

/** The local participant. colorIndex is 1-8, matching --color-collab-1..8. */
export type CollabMe = {
  subject: string
  name: string
  colorIndex: number
  role: CollabRole
  /** This connection's id on the server (`hello.conn`): lock holders are keyed by connection, not user. */
  conn: string
  clientId: number
  avatarUrl?: string | null
}

/** A held line lock as the server reports it. */
export type LockHolderView = {
  holderConn: string
  subject: string
  name: string
  colorIndex: number
}

/** The full lock table, keyed by line id. */
export type LockSnapshot = Record<string, LockHolderView>

/** What the editor needs from a session to take part in line locking. */
export type CollabLockInput = {
  provider: HocuspocusProvider | null
  me: CollabMe | null
  locks: LockSnapshot
}

/** Same updater shape useHistory's setter accepts. */
export type LinesUpdater = EditorLine[] | ((prev: EditorLine[]) => EditorLine[])

/** Connection state of the shared doc. 'ended' and 'forbidden' are terminal: the provider stops reconnecting. */
export type CollabStatus = 'connecting' | 'synced' | 'offline' | 'ended' | 'forbidden'

// ── Server contract (GraphQL `collab` schema and POST /collab/join) ──────────

export type CollabParticipant = {
  /** `user:<id>` or `guest:<id>`. */
  subject: string
  name: string
  role: CollabRole
  colorIndex: number
  /** Owner-only, guests only; null otherwise. */
  inviteId: string | null
  avatarUrl?: string | null
}

export type CollabInvite = {
  id: string
  role: Exclude<CollabRole, 'owner'>
  revoked: boolean
  createdAt: string
}

export type CollabSession = {
  id: string
  publicId: string
  allowGuests: boolean
  members: CollabParticipant[]
  /** Empty unless the caller is the owner. */
  invites: CollabInvite[]
}

export type CollabKickResult = { revokedInviteId: string | null }

export type CollabJoinResult = { ok: true; publicId: string; role: CollabRole }

// ── Presence (Hocuspocus awareness; never written to the Y.Doc) ──────────────

export type PointerState =
  | { area: 'lines'; lineId: string; xRatio: number; yRatio: number }
  | { area: 'waveform'; time: number }
  | null

/** Which layout a participant has open; only these four values are accepted from a peer. */
export type PresenceView = 'editor' | 'words-focus' | 'preview' | 'mobile'

/** A pointer, or a function measuring it when the update is sent (undefined: nothing to send). */
export type PointerInput = PointerState | (() => PointerState | undefined)

/** `t` is the player position in seconds when it was published; `rate` is the playback speed. */
export type PlayheadState = { t: number; playing: boolean; rate: number }

/** Another participant, as seen through awareness. Self is never included. */
export type CollabPeer = {
  clientId: number
  /** Stamped by the server from the authenticated principal, so it cannot be forged by the peer. */
  subject: string
  name: string
  colorIndex: number
  role: CollabRole
  avatarUrl: string | null
  pointer: PointerState
  playhead: PlayheadState | null
  activeLineId: string | null
  /** Seconds of the media loaded in their player, null when none. */
  duration: number | null
  /** The view they have open, null when unknown (an older client, or a value off the whitelist). */
  view: PresenceView | null
  /** Local time (ms) the playhead was received, the base for extrapolating it. */
  receivedAt: number
}

/** A collaborator's cursor line as a row sees it. The object is reused while its fields are unchanged. */
export type RemoteActiveView = { name: string; colorIndex: number }

/** One row of the sessions page: a live session and the project it is about. */
export type CollabSessionSummary = {
  publicId: string
  title: string
  songName: string
  songArtist: string
  role: CollabRole
  memberCount: number
  createdAt: string
  lastActivityAt: string
}
