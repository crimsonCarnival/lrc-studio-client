import { act, render, renderHook } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import type { EditorLine } from '../editor/editor.types'
import { applyLinesToDoc, docToLines } from './collab-doc'
import { loadCollabRuntime } from './load-collab-runtime'
import { useCollabLines } from './useCollabLines'

const mk = (id: string, text: string): EditorLine => ({ id, text, timestamp: null })
const texts = (ls: EditorLine[]) => ls.map((l) => l.text)
const docTexts = (doc: Y.Doc) => texts(docToLines(doc, []))

function seeded(lines: EditorLine[]): Y.Doc {
  const doc = new Y.Doc()
  applyLinesToDoc(doc, [], lines)
  return doc
}

// A second client: edits a copy of the doc and ships the update back with a non-local origin.
function remoteEdit(doc: Y.Doc, edit: (remote: Y.Doc) => void) {
  const remote = new Y.Doc()
  Y.applyUpdate(remote, Y.encodeStateAsUpdate(doc))
  const before = Y.encodeStateVector(remote)
  edit(remote)
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(remote, before), 'remote')
}

function remoteSetText(doc: Y.Doc, id: string, text: string) {
  remoteEdit(doc, (r) => {
    r.transact(() => (r.getMap('lines').get(id) as Y.Map<unknown>).set('text', text))
  })
}

describe('useCollabLines', () => {
  // The app loads yjs lazily with the first session; here it is loaded up front.
  beforeAll(() => loadCollabRuntime())

  it('starts from the doc', () => {
    const doc = seeded([mk('a', 'one'), mk('b', 'two')])
    const { result } = renderHook(() => useCollabLines(doc))
    expect(texts(result.current[0])).toEqual(['one', 'two'])
  })

  it('local set updates state before the doc', () => {
    const doc = seeded([mk('a', 'one')])
    // Each render records what the doc held when that state was committed to screen.
    const seen: { lines: (string | undefined)[]; doc: (string | undefined)[] }[] = []
    let set: ReturnType<typeof useCollabLines>[1] = () => {}
    function Probe() {
      const [lines, setLines] = useCollabLines(doc)
      set = setLines
      seen.push({ lines: texts(lines), doc: docTexts(doc) })
      return null
    }
    render(<Probe />)

    act(() => {
      set((prev) => prev.map((l) => ({ ...l, text: 'edited' })))
      // Inside the handler the doc must not have been touched.
      expect(docTexts(doc)).toEqual(['one'])
    })

    const firstEdited = seen.find((s) => s.lines[0] === 'edited')
    expect(firstEdited?.doc).toEqual(['one'])
    expect(docTexts(doc)).toEqual(['edited'])
  })

  it('gives every line an id before it reaches state', () => {
    const doc = seeded([mk('a', 'one')])
    const { result } = renderHook(() => useCollabLines(doc))
    act(() => result.current[1]((prev) => [...prev, { text: 'new', timestamp: null }]))
    expect(result.current[0].every((l) => typeof l.id === 'string' && l.id)).toBe(true)
    expect(docTexts(doc)).toEqual(['one', 'new'])
  })

  it('remote change appears in state and is not undoable locally', () => {
    const doc = seeded([mk('a', 'one'), mk('b', 'two')])
    const { result } = renderHook(() => useCollabLines(doc))

    act(() => remoteSetText(doc, 'b', 'remote'))
    expect(texts(result.current[0])).toEqual(['one', 'remote'])
    expect(result.current[4]).toBe(false) // canUndo

    act(() => result.current[2]()) // undo
    expect(texts(result.current[0])).toEqual(['one', 'remote'])
  })

  it('undo after a collaborator edit reverts only my change', () => {
    const doc = seeded([mk('a', 'one'), mk('b', 'two')])
    const { result } = renderHook(() => useCollabLines(doc))

    act(() => result.current[1]((prev) => prev.map((l) => (l.id === 'a' ? { ...l, text: 'mine' } : l))))
    expect(result.current[4]).toBe(true)
    act(() => remoteSetText(doc, 'b', 'theirs'))
    expect(texts(result.current[0])).toEqual(['mine', 'theirs'])

    act(() => result.current[2]())
    expect(texts(result.current[0])).toEqual(['one', 'theirs'])
    expect(docTexts(doc)).toEqual(['one', 'theirs'])
    expect(result.current[5]).toBe(true) // canRedo

    act(() => result.current[3]())
    expect(texts(result.current[0])).toEqual(['mine', 'theirs'])
  })

  it('a remote edit landing before a local write is committed keeps both', () => {
    const doc = seeded([mk('a', 'one'), mk('b', 'two')])
    const { result } = renderHook(() => useCollabLines(doc))
    act(() => {
      result.current[1]((prev) => prev.map((l) => (l.id === 'a' ? { ...l, text: 'mine' } : l)))
      remoteSetText(doc, 'b', 'theirs')
    })
    expect(texts(result.current[0])).toEqual(['mine', 'theirs'])
    expect(docTexts(doc)).toEqual(['mine', 'theirs'])
  })

  it('setter identity is stable', () => {
    const doc = seeded([mk('a', 'one')])
    const { result, rerender } = renderHook(() => useCollabLines(doc))
    const [, set, undo, redo, , , clear] = result.current
    act(() => set((prev) => [...prev, mk('c', 'three')]))
    rerender()
    expect(result.current[1]).toBe(set)
    expect(result.current[2]).toBe(undo)
    expect(result.current[3]).toBe(redo)
    expect(result.current[6]).toBe(clear)
  })

  it('a null doc yields no lines and switching docs never writes the old lines into the new doc', () => {
    const a = seeded([mk('a', 'one')])
    const b = seeded([mk('x', 'other')])
    const { result, rerender } = renderHook(({ doc }) => useCollabLines(doc), { initialProps: { doc: null as Y.Doc | null } })
    expect(result.current[0]).toEqual([])
    rerender({ doc: a })
    expect(texts(result.current[0])).toEqual(['one'])
    rerender({ doc: b })
    expect(texts(result.current[0])).toEqual(['other'])
    expect(docTexts(b)).toEqual(['other'])
    expect(docTexts(a)).toEqual(['one'])
  })
})
