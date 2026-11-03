import { act, renderHook } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import type { EditorLine } from '../editor.types'
import type { StampResultDto } from './asr.service'
import { applyLinesToDoc, docToLines } from '@/features/collab/collab-doc'
import { loadCollabRuntime } from '@/features/collab/load-collab-runtime'
import { useCollabLines } from '@/features/collab/useCollabLines'
import { sentIndexResolver } from '../utils/sent-lines'
import { linesNeedingIds, stampLines } from './stamp-results'

const mk = (id: string | undefined, text: string, timestamp: number | null = null): EditorLine =>
  (id ? { id, text, timestamp } : { text, timestamp })
const res = (index: number, timestamp: number | null): StampResultDto =>
  ({ index, timestamp, endTime: null, confidence: 0.9, status: timestamp === null ? 'none' : 'matched', words: null })

describe('stampLines', () => {
  it('stamps by the line the job started on, not by current position', () => {
    const start = [mk('a', 'one'), mk('b', 'two')]
    const now = [mk('n', 'inserted'), start[0], start[1]]
    const opts = { applyMode: 'all' as const, editorMode: 'lrc', startIndexOf: sentIndexResolver(start), minted: new Map() }
    const { lines, conf } = stampLines(now, [res(0, 1), res(1, 2)], opts)
    expect(lines.map((l) => [l.id, l.timestamp])).toEqual([['n', null], ['a', 1], ['b', 2]])
    expect([...conf.keys()]).toEqual(['a', 'b'])
  })

  it('names an id-less line with the caller-minted id, the same way on every run', () => {
    const start = [mk(undefined, 'one')]
    const startIndexOf = sentIndexResolver(start)
    const minted = new Map(linesNeedingIds(start, [res(0, 3)], startIndexOf).map((l) => [l, 'minted-1'] as const))
    const opts = { applyMode: 'all' as const, editorMode: 'lrc', startIndexOf, minted }
    expect(stampLines(start, [res(0, 3)], opts).lines[0]).toMatchObject({ id: 'minted-1', timestamp: 3 })
    expect(stampLines(start, [res(0, 3)], opts).lines[0].id).toBe('minted-1')
  })

  it('returns the same array when empty-only has nothing to fill', () => {
    const start = [mk('a', 'one', 5)]
    const opts = { applyMode: 'empty-only' as const, editorMode: 'lrc', startIndexOf: sentIndexResolver(start), minted: new Map() }
    expect(stampLines(start, [res(0, 1)], opts).lines).toBe(start)
  })
})

describe('Auto Stamp apply in a collab session', () => {
  beforeAll(() => loadCollabRuntime())

  it('a remote insert that reached state before apply survives', () => {
    const doc = new Y.Doc()
    applyLinesToDoc(doc, [], [mk('a', 'one'), mk('b', 'two')])
    const { result } = renderHook(() => useCollabLines(doc))
    const startLines = result.current[0]
    // The lines as the hook last saw them (linesRef): captured before the insert.
    const rendered = result.current[0]

    act(() => {
      const remote = new Y.Doc()
      Y.applyUpdate(remote, Y.encodeStateAsUpdate(doc))
      const before = Y.encodeStateVector(remote)
      const prev = docToLines(remote, [])
      applyLinesToDoc(remote, prev, [...prev, mk('r', 'theirs')])
      Y.applyUpdate(doc, Y.encodeStateAsUpdate(remote, before), 'remote')
    })

    const results = [res(0, 1), res(1, 2)]
    const startIndexOf = sentIndexResolver(startLines)
    const minted = new Map(linesNeedingIds(rendered, results, startIndexOf).map((l) => [l, crypto.randomUUID()] as const))
    const options = { applyMode: 'all' as const, editorMode: 'lrc', startIndexOf, minted }
    act(() => result.current[1]((prev) => stampLines(prev, results, options).lines))

    expect(docToLines(doc, []).map((l) => [l.id, l.timestamp])).toEqual([['a', 1], ['b', 2], ['r', null]])
  })
})
