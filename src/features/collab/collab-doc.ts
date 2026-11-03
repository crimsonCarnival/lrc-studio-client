import deepEqual from 'fast-deep-equal'
import { generateNKeysBetween } from 'fractional-indexing'
import * as Y from 'yjs'
import type { EditorLine } from '../editor/editor.types'
import type { CollabMeta } from './collab.types'

/** Origin of every local write, so observers can tell local from remote transactions. */
export const LOCAL_ORIGIN: unique symbol = Symbol('collab-local')

// Mirrors LINE_FIELDS in the server's collab.projection.ts. Keep in step.
const LINE_FIELDS = [
  'text', 'timestamp', 'endTime', 'secondary', 'translation', 'translations', 'words',
  'secondaryWords', 'type', 'label', 'depth', 'singers', 'mode', 'source', 'confidence', 'adLibOf',
] as const

type LineMap = Y.Map<unknown>
type Entry = { id: string; order: string; map: LineMap }

const orderOf = (m: LineMap): string => {
  const o = m.get('order')
  return typeof o === 'string' ? o : ''
}

// Sort by order, ties by id; a missing order sorts as '' (same as the server).
function sortedEntries(lines: Y.Map<LineMap>): Entry[] {
  return [...lines.entries()]
    .map(([id, map]) => ({ id, order: orderOf(map), map }))
    .sort((a, b) => (a.order !== b.order ? (a.order < b.order ? -1 : 1) : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

/**
 * Doc -> lines. Reuses the `prev` object (by identity) when every stored field equals it.
 * When a line changed, local-only fields on the prev object (e.g. furigana) are kept.
 */
export function docToLines(doc: Y.Doc, prev: EditorLine[]): EditorLine[] {
  const prevById = new Map<string, EditorLine>()
  for (const l of prev) if (l.id) prevById.set(l.id, l)

  return sortedEntries(doc.getMap<LineMap>('lines')).map(({ id, map }) => {
    const old = prevById.get(id)
    if (old && LINE_FIELDS.every((f) => deepEqual(old[f], map.get(f)))) return old
    const line: EditorLine = old ? { ...old } : {}
    line.id = id
    for (const f of LINE_FIELDS) {
      const v = map.get(f)
      if (v === undefined) delete line[f]
      else (line as Record<string, unknown>)[f] = v
    }
    return line
  })
}

/** Indices (into `seq`) of a longest strictly increasing subsequence. */
function lisIndices(seq: string[]): Set<number> {
  const tails: number[] = []
  const parent: number[] = new Array(seq.length).fill(-1)
  for (let i = 0; i < seq.length; i++) {
    let lo = 0
    let hi = tails.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (seq[tails[mid]] < seq[i]) lo = mid + 1
      else hi = mid
    }
    if (lo > 0) parent[i] = tails[lo - 1]
    tails[lo] = i
  }
  const out = new Set<number>()
  for (let k = tails.length ? tails[tails.length - 1] : -1; k >= 0; k = parent[k]) out.add(k)
  return out
}

function writeFields(map: LineMap, line: EditorLine): void {
  for (const f of LINE_FIELDS) {
    const v = line[f]
    if (v === undefined) {
      if (map.has(f)) map.delete(f)
    } else if (!deepEqual(map.get(f), v)) {
      map.set(f, v)
    }
  }
}

/**
 * Lines -> doc, as one synchronous transaction with LOCAL_ORIGIN. Writes only what changed:
 * new ids insert, missing ids delete, changed fields set per key, and only lines outside the
 * longest run that kept its relative order get a new `order`. Lines without an id are given
 * one in place (crypto.randomUUID) before diffing.
 */
export function applyLinesToDoc(doc: Y.Doc, prev: EditorLine[], next: EditorLine[]): void {
  for (const l of next) if (!l.id) l.id = crypto.randomUUID()
  const prevById = new Map<string, EditorLine>()
  for (const l of prev) if (l.id) prevById.set(l.id, l)
  const nextIds = new Set(next.map((l) => l.id as string))

  doc.transact(() => {
    const lines = doc.getMap<LineMap>('lines')
    for (const id of [...lines.keys()]) if (!nextIds.has(id)) lines.delete(id)

    // Orders of surviving lines, in the new sequence. Lines with no usable order cannot stay.
    const stored = next.map((l) => {
      const m = lines.get(l.id as string)
      return m && orderOf(m) !== '' ? orderOf(m) : null
    })
    const candidates = stored.flatMap((o, i) => (o === null ? [] : [i]))
    const keep = lisIndices(candidates.map((i) => stored[i] as string))
    const stays = new Set([...keep].map((k) => candidates[k]))

    // Assign fresh keys to each run of non-staying lines between two staying anchors.
    const newOrder = new Map<number, string>()
    let i = 0
    while (i < next.length) {
      if (stays.has(i)) { i++; continue }
      let j = i
      while (j < next.length && !stays.has(j)) j++
      const lo = i > 0 ? (stored[i - 1] as string) : null
      const hi = j < next.length ? (stored[j] as string) : null
      generateNKeysBetween(lo, hi, j - i).forEach((k, n) => newOrder.set(i + n, k))
      i = j
    }

    next.forEach((line, idx) => {
      const id = line.id as string
      let map = lines.get(id)
      if (!map) {
        map = new Y.Map<unknown>()
        map.set('id', id)
        map.set('order', newOrder.get(idx) as string)
        writeFields(map, line)
        lines.set(id, map)
        return
      }
      const o = newOrder.get(idx)
      if (o !== undefined) map.set('order', o)
      if (prevById.get(id) !== line) writeFields(map, line)
    })
  }, LOCAL_ORIGIN)
}

export function readMeta(doc: Y.Doc): CollabMeta {
  const m = doc.getMap<unknown>('meta')
  return {
    editorMode: (m.get('editorMode') as CollabMeta['editorMode'] | undefined) ?? 'lrc',
    title: (m.get('title') as string | null | undefined) ?? null,
    artist: (m.get('artist') as string | null | undefined) ?? null,
    album: (m.get('album') as string | null | undefined) ?? null,
    media: (m.get('media') as CollabMeta['media'] | undefined) ?? { source: null, url: null, uploadId: null },
  }
}
