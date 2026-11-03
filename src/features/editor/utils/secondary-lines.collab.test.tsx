import { act, renderHook } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import type { EditorLine } from '../editor.types'
import { applyLinesToDoc, docToLines } from '@/features/collab/collab-doc'
import { loadCollabRuntime } from '@/features/collab/load-collab-runtime'
import { useCollabLines } from '@/features/collab/useCollabLines'
import { applySecondaryLines, mainLineIndices } from './secondary-lines'

const mk = (id: string, text: string, secondary?: string): EditorLine =>
  (secondary === undefined ? { id, text, timestamp: null } : { id, text, timestamp: null, secondary })

function remoteEdit(doc: Y.Doc, edit: (lines: EditorLine[]) => EditorLine[]) {
  const remote = new Y.Doc()
  Y.applyUpdate(remote, Y.encodeStateAsUpdate(doc))
  const before = Y.encodeStateVector(remote)
  const prev = docToLines(remote, [])
  applyLinesToDoc(remote, prev, edit(prev))
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(remote, before), 'remote')
}

describe('bulk secondary lines in a collab session', () => {
  beforeAll(() => loadCollabRuntime())

  it('a remote insert while the modal is open neither shifts the values nor is overwritten', () => {
    const doc = new Y.Doc()
    applyLinesToDoc(doc, [], [mk('a', 'one'), mk('b', 'two')])
    const { result } = renderHook(() => useCollabLines(doc))

    // The modal opens: it captures the main lines.
    const now = result.current[0]
    const opened = mainLineIndices(now).map((i) => now[i])

    // While it is open a collaborator inserts a line at the top, with its own secondary.
    act(() => remoteEdit(doc, (prev) => [mk('r', 'theirs', 'their romaji'), ...prev]))
    expect(result.current[0].map((l) => l.id)).toEqual(['r', 'a', 'b'])

    // Apply: values[n] belongs to opened[n].
    act(() => result.current[1]((prev) => applySecondaryLines(prev, ['ichi', 'ni'], opened).lines))

    expect(docToLines(doc, []).map((l) => [l.id, l.secondary])).toEqual([
      ['r', 'their romaji'],
      ['a', 'ichi'],
      ['b', 'ni'],
    ])
  })

  it('an unchanged value never reverts a secondary a collaborator edited meanwhile', () => {
    const doc = new Y.Doc()
    applyLinesToDoc(doc, [], [mk('a', 'one', 'old'), mk('b', 'two')])
    const { result } = renderHook(() => useCollabLines(doc))
    const now = result.current[0]
    const opened = mainLineIndices(now).map((i) => now[i])

    act(() => remoteEdit(doc, (prev) => prev.map((l) => (l.id === 'a' ? { ...l, secondary: 'theirs' } : l))))
    // The user only filled line b; line a's text in the modal is still what it opened with.
    act(() => result.current[1]((prev) => applySecondaryLines(prev, ['old', 'ni'], opened).lines))

    expect(docToLines(doc, []).map((l) => [l.id, l.secondary])).toEqual([['a', 'theirs'], ['b', 'ni']])
  })

  it('a line deleted remotely while the modal is open is skipped', () => {
    const doc = new Y.Doc()
    applyLinesToDoc(doc, [], [mk('a', 'one'), mk('b', 'two')])
    const { result } = renderHook(() => useCollabLines(doc))
    const now = result.current[0]
    const opened = mainLineIndices(now).map((i) => now[i])

    act(() => remoteEdit(doc, (prev) => prev.filter((l) => l.id !== 'a')))
    act(() => result.current[1]((prev) => applySecondaryLines(prev, ['ichi', 'ni'], opened).lines))

    expect(docToLines(doc, []).map((l) => [l.id, l.secondary])).toEqual([['b', 'ni']])
  })
})
