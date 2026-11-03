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
