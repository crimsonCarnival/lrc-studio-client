import { act, renderHook } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import type { EditorLine } from '../editor.types'
import { applyLinesToDoc, docToLines } from '@/features/collab/collab-doc'
import { loadCollabRuntime } from '@/features/collab/load-collab-runtime'
import { useCollabLines } from '@/features/collab/useCollabLines'
import { applyInferredEndTimes, sentIndexResolver } from './sent-lines'

const mk = (id: string | undefined, text: string, timestamp: number | null = null): EditorLine =>
  (id ? { id, text, timestamp } : { text, timestamp })

describe('sentIndexResolver', () => {
  it('finds a line by id after it was copied, and by identity when it has no id', () => {
    const a = mk('a', 'one')
    const b = mk(undefined, 'two')
    const resolve = sentIndexResolver([a, b])
    expect(resolve({ ...a, text: 'edited' })).toBe(0)
    expect(resolve(b)).toBe(1)
    expect(resolve({ ...b })).toBeUndefined()
    expect(resolve(mk('x', 'new'))).toBeUndefined()
  })
})

describe('applyInferredEndTimes', () => {
  it('applies results by line, not position, after an insert and a delete', () => {
    const sent = [mk('a', 'one', 1), mk('b', 'two', 2), mk('c', 'three', 3)]
    const inferred = [{ ...sent[0], endTime: 1.9 }, { ...sent[1], endTime: 2.9 }, { ...sent[2], endTime: 8 }]
    // Meanwhile: a new first line, and 'b' deleted.
    const now = [mk('n', 'inserted', 0.5), sent[0], sent[2]]
    const out = applyInferredEndTimes(now, sentIndexResolver(sent), inferred)
    expect(out.map((l) => [l.id, l.endTime])).toEqual([['n', undefined], ['a', 1.9], ['c', 8]])
    expect(out[0]).toBe(now[0])
  })

  it('touches only endTime and keeps identity when nothing changes', () => {
    const sent = [mk('a', 'one', 1)]
    const now = [{ ...sent[0], text: 'retyped meanwhile' }]
    // A server line carrying stale fields: only its endTime may be used.
    const stale: EditorLine = { id: 'zzz', text: 'stale', timestamp: 9, endTime: 2 }
    const out = applyInferredEndTimes(now, sentIndexResolver(sent), [stale])
    expect(out[0]).toEqual({ id: 'a', text: 'retyped meanwhile', timestamp: 1, endTime: 2 })
    const same = applyInferredEndTimes(out, sentIndexResolver(sent), [{ endTime: 2 }])
    expect(same).toBe(out)
  })

  it('ignores missing or non-numeric end times', () => {
    const sent = [mk('a', 'one', 1)]
    const out = applyInferredEndTimes(sent, sentIndexResolver(sent), [{ endTime: null }])
    expect(out).toBe(sent)
  })
})

describe('end-time inference in a collab session', () => {
  beforeAll(() => loadCollabRuntime())

  it('a remote insert during the request keeps every line and lands each end time on its own line', () => {
    const doc = new Y.Doc()
    applyLinesToDoc(doc, [], [mk('a', 'one', 1), mk('b', 'two', 2)])
    const { result } = renderHook(() => useCollabLines(doc))

    // Request time: what was sent.
    const sent = result.current[0]
    const inferred = sent.map((l, i) => ({ ...l, endTime: 10 + i }))

    // The async gap: a collaborator inserts a line at the top.
    act(() => {
      const remote = new Y.Doc()
      Y.applyUpdate(remote, Y.encodeStateAsUpdate(doc))
      const before = Y.encodeStateVector(remote)
      const prev = docToLines(remote, [])
      applyLinesToDoc(remote, prev, [mk('r', 'theirs', 0.5), ...prev])
      Y.applyUpdate(doc, Y.encodeStateAsUpdate(remote, before), 'remote')
    })
    expect(result.current[0].map((l) => l.id)).toEqual(['r', 'a', 'b'])

    // Response: applied onto the current lines.
    const resolve = sentIndexResolver(sent)
    act(() => result.current[1]((prev) => applyInferredEndTimes(prev, resolve, inferred)))

    const lines = docToLines(doc, [])
    expect(lines.map((l) => [l.id, l.text, l.endTime])).toEqual([
      ['r', 'theirs', undefined],
      ['a', 'one', 10],
      ['b', 'two', 11],
    ])
  })
})
