import { useCallback, useEffect, useRef, useState } from 'react'
import type * as Y from 'yjs'
import type { EditorLine } from '../editor/editor.types'
import type { LinesUpdater } from './collab.types'
import { requireCollabRuntime } from './load-collab-runtime'

const EMPTY: EditorLine[] = []
const CAPTURE_TIMEOUT_MS = 1000

// Lines are tagged with the doc they came from, so a doc switch can never write
// the previous doc's lines into the new one.
type Tagged = { doc: Y.Doc | null; lines: EditorLine[] }

const sameLines = (a: EditorLine[], b: EditorLine[]): boolean =>
  a.length === b.length && a.every((l, i) => l === b[i])

/**
 * Lines backed by a shared Y.Doc, with the same tuple shape as useHistory:
 * [lines, setLines, undo, redo, canUndo, canRedo, clearHistory].
 *
 * React state stays the source of render. The setter only updates state; the doc
 * write (applyLinesToDoc) runs in an effect after commit. Undo/redo are queued
 * the same way. So no handler that calls these ever touches Yjs synchronously,
 * which keeps the tap handler, audio clock and highlight loop off the CRDT.
 *
 * Remote changes (any origin other than LOCAL_ORIGIN) are read back in that same
 * effect, after any pending local write has been applied, so a local edit that
 * is not committed yet survives a remote edit landing in between.
 */
export function useCollabLines(
  doc: Y.Doc | null,
): [EditorLine[], (u: LinesUpdater) => void, () => void, () => void, boolean, boolean, () => void] {
  const [state, setState] = useState<Tagged>({ doc: null, lines: EMPTY })
  // A counter bumped whenever the doc changed under us, or undo/redo was queued.
  const [tick, setTick] = useState(0)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // The lines as last written to (or read from) the doc: the `prev` for the next write.
  const writtenRef = useRef<EditorLine[]>(EMPTY)
  const remoteDirtyRef = useRef(false)
  const opsRef = useRef<('undo' | 'redo')[]>([])
  const undoManagerRef = useRef<Y.UndoManager | null>(null)

  // Attach: snapshot the doc, observe remote changes, own the undo manager.
  useEffect(() => {
    writtenRef.current = EMPTY
    remoteDirtyRef.current = false
    opsRef.current = []
    if (!doc) {
      // Synchronising React state with an external system (the shared doc).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ doc: null, lines: EMPTY })
      return
    }
    const { docToLines, UndoManager, LOCAL_ORIGIN } = requireCollabRuntime()
    const map = doc.getMap('lines')
    const initial = docToLines(doc, EMPTY)
    writtenRef.current = initial
    setState({ doc, lines: initial })

    const um = new UndoManager(map, { trackedOrigins: new Set([LOCAL_ORIGIN]), captureTimeout: CAPTURE_TIMEOUT_MS })
    undoManagerRef.current = um
    const syncFlags = () => {
      setCanUndo(um.canUndo())
      setCanRedo(um.canRedo())
    }
    syncFlags()
    um.on('stack-item-added', syncFlags)
    um.on('stack-item-popped', syncFlags)
    um.on('stack-cleared', syncFlags)

    const onChange = (_events: unknown, txn: Y.Transaction) => {
      if (txn.origin === LOCAL_ORIGIN) return
      remoteDirtyRef.current = true
      setTick((t) => t + 1)
    }
    map.observeDeep(onChange)
    return () => {
      map.unobserveDeep(onChange)
      um.destroy()
      if (undoManagerRef.current === um) undoManagerRef.current = null
      setCanUndo(false)
      setCanRedo(false)
    }
  }, [doc])

  // After commit: write local changes, run queued undo/redo, then read remote changes back.
  useEffect(() => {
    if (!doc || state.doc !== doc) return
    const { applyLinesToDoc, docToLines } = requireCollabRuntime()
    const current = state.lines
    if (current !== writtenRef.current) {
      applyLinesToDoc(doc, writtenRef.current, current)
      writtenRef.current = current
    }
    const um = undoManagerRef.current
    for (const op of opsRef.current.splice(0)) {
      if (!um) break
      if (op === 'undo') um.undo()
      else um.redo()
    }
    if (!remoteDirtyRef.current) return
    remoteDirtyRef.current = false
    const fromDoc = docToLines(doc, current)
    writtenRef.current = fromDoc
    // Reading back an external system (the shared doc) after it changed under us.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!sameLines(fromDoc, current)) setState({ doc, lines: fromDoc })
  }, [doc, state, tick])

  const setLines = useCallback((u: LinesUpdater) => {
    setState((prev) => {
      const next = typeof u === 'function' ? u(prev.lines) : u
      if (next === prev.lines) return prev
      // No doc means nothing is rendered from this state, and no runtime may be loaded yet.
      return { doc: prev.doc, lines: prev.doc ? requireCollabRuntime().ensureLineIds(next) : next }
    })
  }, [])

  const undo = useCallback(() => {
    opsRef.current.push('undo')
    setTick((t) => t + 1)
  }, [])

  const redo = useCallback(() => {
    opsRef.current.push('redo')
    setTick((t) => t + 1)
  }, [])

  // Clears the stacks only; it never writes to the doc.
  const clearHistory = useCallback(() => {
    undoManagerRef.current?.clear()
  }, [])

  const lines = state.doc === doc ? state.lines : EMPTY
  return [lines, setLines, undo, redo, canUndo && !!doc, canRedo && !!doc, clearHistory]
}
