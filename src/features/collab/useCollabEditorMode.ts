import { useEffect, useRef } from 'react'
import type * as Y from 'yjs'
import { requireCollabRuntime } from './load-collab-runtime'
import type { CollabMeta, CollabStatus } from './collab.types'

const MODES: readonly string[] = ['lrc', 'srt', 'words'] satisfies CollabMeta['editorMode'][]

/**
 * Keeps the editor mode in step with the shared doc's `meta.editorMode`.
 * Pull: every doc change of the mode is applied locally. Push: a local mode
 * change is written back, but only by someone allowed to write, only once the
 * first sync has delivered the doc's own mode (so a stale local mode can never
 * race the server's), and after commit like every other doc write.
 */
export function useCollabEditorMode(
  doc: Y.Doc | null,
  status: CollabStatus,
  canWrite: boolean,
  editorMode: string,
  setEditorMode: (mode: string) => void,
): void {
  // The mode as last seen in the doc; null until the doc has one.
  const docModeRef = useRef<string | null>(null)

  useEffect(() => {
    docModeRef.current = null
    if (!doc) return
    const { readMeta } = requireCollabRuntime()
    const meta = doc.getMap('meta')
    const pull = () => {
      if (!meta.has('editorMode')) return
      const mode = readMeta(doc).editorMode
      if (!MODES.includes(mode)) return
      docModeRef.current = mode
      setEditorMode(mode)
    }
    pull()
    meta.observe(pull)
    return () => meta.unobserve(pull)
  }, [doc, setEditorMode])

  useEffect(() => {
    if (!doc || status !== 'synced' || !canWrite) return
    if (docModeRef.current === null || editorMode === docModeRef.current || !MODES.includes(editorMode)) return
    docModeRef.current = editorMode
    const { LOCAL_ORIGIN } = requireCollabRuntime()
    doc.transact(() => doc.getMap('meta').set('editorMode', editorMode), LOCAL_ORIGIN)
  }, [doc, status, canWrite, editorMode])
}
