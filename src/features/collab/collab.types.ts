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
  clientId: number
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
