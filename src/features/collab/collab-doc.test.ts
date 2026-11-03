import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import type { EditorLine } from '../editor/editor.types'
import { applyLinesToDoc, docToLines, LOCAL_ORIGIN, readMeta } from './collab-doc'

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

  it('assigns ids to lines without one', () => {
    const doc = new Y.Doc()
    applyLinesToDoc(doc, [], [{ text: 'x' }])
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
})
