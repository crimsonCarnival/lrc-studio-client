import { useEffect, useState } from 'react'
import type * as Y from 'yjs'
import { requireCollabRuntime } from './load-collab-runtime'
import type { CollabMeta } from './collab.types'
import type { RestoredMedia } from '@/types/app-state'
import { CDN_PATTERN, YT_PATTERN } from '@/features/player/services/player.service'

type CollabMedia = CollabMeta['media']

/** Real YouTube ids are this alphabet only; YT_PATTERN alone lets through any 11 non-separator chars. */
const YT_ID = /^[A-Za-z0-9_-]{11}$/

/**
 * The player's hydration descriptor for the session's shared media, or null when there is
 * none to load (each participant then loads their own copy, and SharedAudioNotice asks for it).
 * `meta.media` is shared-doc data any editor can write, so it is validated, never passed through:
 * Cloudinary only over https from res.cloudinary.com's delivery path; YouTube only as a video id,
 * rebuilt into a canonical watch URL. Anything else is treated as no shared media.
 * A Cloudinary upload is keyed by its upload id, falling back on its url: PlayerEngine
 * skips a descriptor without a key.
 */
export function collabMediaToRestored(media: unknown): RestoredMedia | null {
  if (typeof media !== 'object' || media === null) return null
  const { source, url, uploadId } = media as Record<string, unknown>
  if (typeof url !== 'string' || !url) return null
  if (source === 'youtube') {
    const id = url.match(YT_PATTERN)?.[1]
    return id && YT_ID.test(id) ? { type: 'youtube', url: `https://www.youtube.com/watch?v=${id}` } : null
  }
  if (source === 'cloudinary') {
    if (!url.startsWith('https://') || !CDN_PATTERN.test(url)) return null
    const id = typeof uploadId === 'string' && uploadId ? uploadId : url
    return { type: 'cloudinary', id, url, fileName: null, title: null, duration: null, publicId: null }
  }
  return null
}

const sameMedia = (a: CollabMedia, b: CollabMedia) => a.source === b.source && a.url === b.url && a.uploadId === b.uploadId

/**
 * The session's shared media (`meta.media`), or null before there is a doc. Follows
 * changes to the meta map; the object keeps its identity while the three fields are
 * unchanged, so effects keyed on it do not rerun for an unrelated meta edit.
 */
export function useCollabMedia(doc: Y.Doc | null): CollabMedia | null {
  const [media, setMedia] = useState<CollabMedia | null>(null)

  useEffect(() => {
    if (!doc) {
      // Synchronising React state with an external system (the shared doc).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMedia(null)
      return
    }
    const { readMeta } = requireCollabRuntime()
    const meta = doc.getMap('meta')
    const pull = () => {
      const next = readMeta(doc).media
      setMedia((prev) => (prev && sameMedia(prev, next) ? prev : next))
    }
    pull()
    meta.observe(pull)
    return () => meta.unobserve(pull)
  }, [doc])

  return media
}
