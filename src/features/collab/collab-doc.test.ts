import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import type { EditorLine } from '../editor/editor.types'
import { applyLinesToDoc, docToLines, ensureLineIds, LOCAL_ORIGIN, readMeta } from './collab-doc'

const mk = (id: string, text: string, extra: Partial<EditorLine> = {}): EditorLine => ({ id, text, ...extra })
const ids = (ls: EditorLine[]) => ls.map((l) => l.id)

function seeded(lines: EditorLine[]): Y.Doc {
  const doc = new Y.Doc()
  applyLinesToDoc(doc, [], lines)
  return doc
}

function sync(a: Y.Doc, b: Y.Doc) {
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a))
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b))
}

describe('collab-doc', () => {
  it('round trip preserves every field', () => {
    const full: EditorLine = {
      id: 'a', text: 'hello', timestamp: 1.5, endTime: 2.5, secondary: 'hola',
      translation: 'hi', translations: [{ text: 'bonjour', language: 'fr' }],
      adLibOf: 1.5, words: [{ word: 'hello', time: 1.5, reading: 'h', singerIndex: 0 }],
      secondaryWords: [{ word: 'hola', time: null }], depth: 1, singers: ['A', 'B'],
      mode: 'duet', source: 'asr', confidence: 0.9,
    }
    const section: EditorLine = { id: 's', type: 'section', label: 'Chorus', text: '' }
    const lines = [section, full, mk('b', 'plain')]
    const doc = seeded(lines)
    expect(docToLines(doc, [])).toEqual(lines)
  })

  it('unchanged lines keep object identity', () => {
    const doc = seeded([mk('a', 'one', { words: [{ word: 'one', time: 1 }] }), mk('b', 'two')])
    const first = docToLines(doc, [])
    doc.transact(() => doc.getMap<Y.Map<unknown>>('lines').get('b')!.set('text', 'TWO'))
    const second = docToLines(doc, first)
    expect(second[0]).toBe(first[0])
    expect(second[1]).not.toBe(first[1])
    expect(second[1].text).toBe('TWO')
  })

  it('single text edit writes one key', () => {
    const lines = [mk('a', 'one'), mk('b', 'two', { timestamp: 3 })]
    const doc = seeded(lines)
    const changed: string[] = []
    doc.on('afterTransaction', (tr: Y.Transaction) => {
      for (const [type, keys] of tr.changed) for (const k of keys) if (k) changed.push(`${type === doc.getMap('lines') ? 'root' : 'line'}:${k}`)
    })
    const next = [lines[0], { ...lines[1], text: 'two!' }]
    applyLinesToDoc(doc, lines, next)
    expect(changed).toEqual(['line:text'])
    expect(docToLines(doc, lines)[1].text).toBe('two!')
  })

  it('moving one line rewrites one order key', () => {
    const lines = [mk('a', '1'), mk('b', '2'), mk('c', '3'), mk('d', '4')]
    const doc = seeded(lines)
    const lineMap = doc.getMap<Y.Map<unknown>>('lines')
    const before = Object.fromEntries([...lineMap].map(([k, m]) => [k, m.get('order')]))
    const next = [lines[0], lines[2], lines[3], lines[1]] // move b to end
    applyLinesToDoc(doc, lines, next)
    const after = Object.fromEntries([...lineMap].map(([k, m]) => [k, m.get('order')]))
    const rewritten = Object.keys(after).filter((k) => after[k] !== before[k])
    expect(rewritten).toEqual(['b'])
    expect(ids(docToLines(doc, lines))).toEqual(['a', 'c', 'd', 'b'])
  })

  it('inserts between neighbours and deletes missing ids', () => {
    const lines = [mk('a', '1'), mk('b', '2'), mk('c', '3')]
    const doc = seeded(lines)
    const next = [lines[0], mk('n', 'new'), lines[2]]
    applyLinesToDoc(doc, lines, next)
    expect(ids(docToLines(doc, lines))).toEqual(['a', 'n', 'c'])
  })

  it('ensured ids are written to the doc', () => {
    const doc = new Y.Doc()
    applyLinesToDoc(doc, [], ensureLineIds([{ text: 'x' }]))
    const out = docToLines(doc, [])
    expect(out).toHaveLength(1)
    expect(typeof out[0].id).toBe('string')
  })

  it('writes with LOCAL_ORIGIN in one transaction', () => {
    const doc = new Y.Doc()
    const origins: unknown[] = []
    doc.on('afterTransaction', (tr: Y.Transaction) => origins.push(tr.origin))
    applyLinesToDoc(doc, [], [mk('a', '1'), mk('b', '2')])
    expect(origins).toEqual([LOCAL_ORIGIN])
  })

  it('concurrent edits to different lines on two docs both survive', () => {
    const lines = [mk('a', 'one'), mk('b', 'two')]
    const d1 = seeded(lines)
    const d2 = new Y.Doc()
    sync(d1, d2)
    applyLinesToDoc(d1, lines, [{ ...lines[0], text: 'ONE' }, lines[1]])
    applyLinesToDoc(d2, lines, [lines[0], { ...lines[1], text: 'TWO' }])
    sync(d1, d2)
    for (const d of [d1, d2]) expect(docToLines(d, lines).map((l) => l.text)).toEqual(['ONE', 'TWO'])
  })

  it('concurrent move of the same line yields one copy', () => {
    const lines = [mk('a', '1'), mk('b', '2'), mk('c', '3')]
    const d1 = seeded(lines)
    const d2 = new Y.Doc()
    sync(d1, d2)
    applyLinesToDoc(d1, lines, [lines[1], lines[0], lines[2]]) // b to front
    applyLinesToDoc(d2, lines, [lines[0], lines[2], lines[1]]) // b to end
    sync(d1, d2)
    const r1 = ids(docToLines(d1, lines))
    expect(r1).toEqual(ids(docToLines(d2, lines)))
    expect(r1.filter((i) => i === 'b')).toHaveLength(1)
    expect(r1).toHaveLength(3)
  })

  it('readMeta returns defaults and stored values', () => {
    const doc = new Y.Doc()
    expect(readMeta(doc)).toEqual({ editorMode: 'lrc', title: null, artist: null, album: null, media: { source: null, url: null, uploadId: null } })
    doc.getMap('meta').set('title', 'T')
    doc.getMap('meta').set('editorMode', 'srt')
    expect(readMeta(doc)).toMatchObject({ title: 'T', editorMode: 'srt' })
  })

  it('a remote insert not yet in prev survives a local edit', () => {
    const lines = [mk('a', '1'), mk('b', '2')]
    const d1 = seeded(lines)
    const d2 = new Y.Doc()
    sync(d1, d2)
    applyLinesToDoc(d2, lines, [lines[0], mk('r', 'remote'), lines[1]])
    sync(d1, d2)
    applyLinesToDoc(d1, lines, [lines[0], { ...lines[1], text: 'B' }])
    expect(ids(docToLines(d1, lines))).toContain('r')
    expect(docToLines(d1, lines).find((l) => l.id === 'b')?.text).toBe('B')
  })

  it('a remote delete is not resurrected by a local edit', () => {
    const lines = [mk('a', '1'), mk('b', '2'), mk('c', '3')]
    const d1 = seeded(lines)
    const d2 = new Y.Doc()
    sync(d1, d2)
    applyLinesToDoc(d2, lines, [lines[0], lines[2]])
    sync(d1, d2)
    applyLinesToDoc(d1, lines, [{ ...lines[0], text: 'A' }, lines[1], lines[2]])
    expect(ids(docToLines(d1, lines))).toEqual(['a', 'c'])
  })

  it('ensureLineIds keeps identity and never mutates', () => {
    const a = mk('a', '1')
    const same = [a]
    expect(ensureLineIds(same)).toBe(same)
    const bare: EditorLine = { text: 'x' }
    const out = ensureLineIds([a, bare])
    expect(out[0]).toBe(a)
    expect(out[1]).not.toBe(bare)
    expect(typeof out[1].id).toBe('string')
    expect(bare.id).toBeUndefined()
  })

  it('applyLinesToDoc throws on an id-less line', () => {
    expect(() => applyLinesToDoc(new Y.Doc(), [], [{ text: 'x' }])).toThrow('applyLinesToDoc: line without id')
  })

  it.each([['empty', ''], ['garbage', '!!!'], ['number', 42], ['object', { x: 1 }]])(
    'malformed order key (%s) does not throw and is repaired',
    (_n, bad) => {
      const lines = [mk('a', '1'), mk('b', '2'), mk('c', '3')]
      const doc = seeded(lines)
      doc.transact(() => doc.getMap<Y.Map<unknown>>('lines').get('b')!.set('order', bad))
      expect(() => docToLines(doc, lines)).not.toThrow()
      expect(() => applyLinesToDoc(doc, lines, [lines[0], { ...lines[1], text: 'B' }, lines[2]])).not.toThrow()
      const m = doc.getMap<Y.Map<unknown>>('lines')
      const orders = ['a', 'b', 'c'].map((k) => m.get(k)!.get('order') as string)
      expect(orders.every((o) => typeof o === 'string' && o !== '')).toBe(true)
      expect(ids(docToLines(doc, lines))).toEqual(['a', 'b', 'c'])
    },
  )

  it('duplicate and inverted anchor keys do not throw', () => {
    const lines = [mk('a', '1'), mk('b', '2'), mk('c', '3'), mk('d', '4')]
    const doc = seeded(lines)
    const m = doc.getMap<Y.Map<unknown>>('lines')
    doc.transact(() => {
      m.get('a')!.set('order', 'a5')
      m.get('b')!.set('order', 'a5')
      m.get('c')!.set('order', 'a2')
      m.get('d')!.set('order', 'a1')
    })
    const next = [lines[0], mk('n', 'new'), lines[1], lines[2], lines[3]]
    expect(() => applyLinesToDoc(doc, lines, next)).not.toThrow()
    expect(ids(docToLines(doc, lines)).sort()).toEqual(['a', 'b', 'c', 'd', 'n'])
  })

  it('a local edit of one field never reverts a remote edit of another field on the same line', () => {
    const doc = seeded([mk('a', 'one', { timestamp: null })])
    const prev = docToLines(doc, [])
    // A collaborator retypes the text; this client has not seen it yet.
    const remote = new Y.Doc()
    Y.applyUpdate(remote, Y.encodeStateAsUpdate(doc))
    ;(remote.getMap('lines').get('a') as Y.Map<unknown>).set('text', 'theirs')
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(remote), 'remote')
    // Local tap on the same line, built from the stale state.
    const next = prev.map((l) => ({ ...l, timestamp: 12.5 }))
    applyLinesToDoc(doc, prev, next)
    const [line] = docToLines(doc, [])
    expect(line.text).toBe('theirs')
    expect(line.timestamp).toBe(12.5)
  })

  it('a field cleared locally is deleted even when other fields are untouched', () => {
    const doc = seeded([mk('a', 'one', { secondary: 'x' })])
    const prev = docToLines(doc, [])
    const next = prev.map((l) => { const c = { ...l }; delete c.secondary; return c })
    applyLinesToDoc(doc, prev, next)
    expect(docToLines(doc, [])[0].secondary).toBeUndefined()
    expect(docToLines(doc, [])[0].text).toBe('one')
  })
})
