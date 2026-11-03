import deepEqual from 'fast-deep-equal'
import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'
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

// With `before` (the line as this client last saw it), only fields this edit changed
// are written, so a field a collaborator changed meanwhile is never reverted to a stale value.
function writeFields(map: LineMap, line: EditorLine, before?: EditorLine): void {
  for (const f of LINE_FIELDS) {
    const v = line[f]
    if (before && deepEqual(before[f], v)) continue
    if (v === undefined) {
      if (map.has(f)) map.delete(f)
    } else if (!deepEqual(map.get(f), v)) {
      map.set(f, v)
    }
  }
}

/** Returns `lines` itself if all have ids; otherwise a copy where only id-less lines are replaced. */
export function ensureLineIds(lines: EditorLine[]): EditorLine[] {
  if (lines.every((l) => l.id)) return lines
  return lines.map((l) => (l.id ? l : { ...l, id: crypto.randomUUID() }))
}

// An order key is usable as an anchor only if fractional-indexing accepts it.
// Anything else (a malicious or buggy client's value) is treated as missing.
function validKey(v: unknown): v is string {
  if (typeof v !== 'string' || v === '') return false
  try {
    generateKeyBetween(v, null)
    return true
  } catch {
    return false
  }
}

/**
 * Lines -> doc, as one synchronous transaction with LOCAL_ORIGIN. Writes only what changed.
 * `prev` is the last state this client saw, so it scopes what this edit may touch:
 * only ids in prev and not in next are deleted (a remote insert not yet in prev survives),
 * only ids in next and not in prev are inserted (a remote delete is not resurrected), and
 * fields are written only to lines still in the doc, and only those that differ from prev. Lines outside the longest run that kept
 * its relative order get a new `order`. Every line must have an id (see ensureLineIds).
 *
 * Field values are shared by reference between the doc and React state: treat them as immutable.
 */
export function applyLinesToDoc(doc: Y.Doc, prev: EditorLine[], next: EditorLine[]): void {
  if (next.some((l) => !l.id)) throw new Error('applyLinesToDoc: line without id')
  const prevById = new Map<string, EditorLine>()
  for (const l of prev) if (l.id) prevById.set(l.id, l)
  const nextIds = new Set(next.map((l) => l.id as string))

  doc.transact(() => {
    const lines = doc.getMap<LineMap>('lines')
    for (const id of prevById.keys()) if (!nextIds.has(id) && lines.has(id)) lines.delete(id)

    // Lines this edit may place: still in the doc, or genuinely new. Others were deleted remotely.
    const live = next.filter((l) => lines.has(l.id as string) || !prevById.has(l.id as string))
    const stored = live.map((l) => {
      const o = lines.get(l.id as string)?.get('order')
      return validKey(o) ? o : null
    })
    const candidates = stored.flatMap((o, i) => (o === null ? [] : [i]))
    const keep = lisIndices(candidates.map((i) => stored[i] as string))
    const stays = new Set([...keep].map((k) => candidates[k]))

    const newOrder = new Map<number, string>()
    try {
      let i = 0
      while (i < live.length) {
        if (stays.has(i)) { i++; continue }
        let j = i
        while (j < live.length && !stays.has(j)) j++
        const lo = i > 0 ? stored[i - 1] : null
        const hi = j < live.length ? stored[j] : null
        generateNKeysBetween(lo, hi, j - i).forEach((k, n) => newOrder.set(i + n, k))
        i = j
      }
    } catch {
      // Last resort: re-key every line we place.
      newOrder.clear()
      generateNKeysBetween(null, null, live.length).forEach((k, n) => newOrder.set(n, k))
    }

    live.forEach((line, idx) => {
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
      const before = prevById.get(id)
      if (before !== line) writeFields(map, line, before)
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
