import { useEffect, useState } from 'react'
import type * as Y from 'yjs'
import { requireCollabRuntime } from './load-collab-runtime'
import type { CollabMeta } from './collab.types'
import type { RestoredMedia } from '@/types/app-state'

type CollabMedia = CollabMeta['media']

/**
 * The player's hydration descriptor for the session's shared media, or null when the
 * session has none (each participant then loads their own copy).
 * A Cloudinary upload is keyed by its upload id, falling back on its url: PlayerEngine
 * skips a descriptor without a key.
 */
export function collabMediaToRestored(media: CollabMedia): RestoredMedia | null {
  if (!media.url) return null
  if (media.source === 'youtube') return { type: 'youtube', url: media.url }
  if (media.source === 'cloudinary') {
    return { type: 'cloudinary', id: media.uploadId ?? media.url, url: media.url, fileName: null, title: null, duration: null, publicId: null }
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
