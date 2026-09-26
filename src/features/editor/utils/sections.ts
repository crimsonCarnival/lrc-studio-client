/**
 * Conversion between the flat internal editor representation (lines[]) and
 * the nested DB representation (sections[]).
 *
 * Flat format: [{type:'section', label, depth, singers, ...}, {text,...}, ...]
 * Nested format: [{label, depth, singers, lines:[{text,...},...]}]
 */
import type { EditorLine } from '@/features/editor/services/editor.service';
import { formatSectionLabelForSerialization, isStructuralSection, getPresetDepthForLabel } from '@/features/editor/constants/sectionTypes';
import { serializeToRubyMarkup } from '@/shared/utils/furigana';

interface Section {
  label: string | null;
  depth: number | null;
  id: string | number | null;
  singers?: string[];
  timestamp: number | null;
  lines: EditorLine[];
}

/**
 * Convert client flat lines array to nested sections.
 * Lines before the first section marker are grouped into an anonymous section.
 */
// lines/sections cross the editor<->DB JSON boundary with several caller-local
// shapes (EditorLine, toolbar line, graphql Section, raw unknown), so the public
// converters stay permissive; the internal Section shape is still modelled.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function flatToSections(lines: any[]): any[] {
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines ?? []) {
    if (line?.type === 'section') {
      if (current) sections.push(current);
      current = {
        label: (line.label as string | undefined) ?? null,
        depth: (line.depth as number | undefined) ?? null,
        id: line.id ?? null,
        singers: Array.isArray(line.singers) ? line.singers : undefined,
        timestamp: typeof line.timestamp === 'number' ? line.timestamp : null,
        lines: [],
      };
    } else if (line) {
      if (!current) current = { label: null, depth: null, id: null, singers: undefined, timestamp: null, lines: [] };
      // Strip section-only and client-only fields before sending to the server.
      // `furigana` is a client rendering cache, not a persisted field.
      const { type: _t, label: _l, depth: _d, furigana: _f, ...rest } = line;
      current.lines.push(rest as EditorLine);
    }
  }
  if (current) sections.push(current);
  return sections;
}

/**
 * Repairs a stored section depth on load.
 *
 * A bug in the Raw Lyrics rebuild used to write depth 0 — a structural root —
 * for any section typed flush-left, which made collapsing it hide every later
 * section and line. Projects saved during that period still carry the bad depth,
 * so fix it where the stored form becomes editor lines.
 *
 * Only labels naming a known depth-1 preset are repaired. Those are
 * unambiguous: nobody promotes a [Chorus] to a structural root above other
 * sections. A CUSTOM label at depth 0 is left exactly as stored, because the
 * bug and a deliberate promotion produce identical data ({label:'Hook',depth:0})
 * and guessing would destroy real structure. Those stay user-fixable via the
 * section's demote action.
 */
function repairStoredSectionDepth(depth: number | null, label: string | null): number | null {
  if (depth !== 0) return depth;
  return getPresetDepthForLabel(label) === 1 ? 1 : depth;
}

/**
 * Convert nested sections back to flat lines (with section marker objects).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sectionsToFlat(sections: any[]): EditorLine[] {
  const flat: EditorLine[] = [];
  for (const sec of sections ?? []) {
    // Anonymous sections (implicit grouping for lines before any explicit section marker)
    // have no label, depth, id, or singers — skip the marker so they don't appear in the editor.
    const isAnonymous = sec.label == null && sec.depth == null && sec.id == null &&
      (!Array.isArray(sec.singers) || sec.singers.length === 0);
    if (!isAnonymous) {
      flat.push({
        type: 'section',
        label: sec.label ?? null,
        depth: repairStoredSectionDepth(sec.depth ?? null, sec.label ?? null),
        id: sec.id ?? null,
        singers: sec.singers,
        timestamp: sec.timestamp ?? null,
        text: '',
      } as EditorLine);
    }
    for (const line of sec.lines ?? []) {
      flat.push(line);
    }
  }
  return flat;
}

/**
 * View-only identity of a section marker for the editor's collapse state: its id, or its
 * index for legacy markers without one (those lose collapse state when lines shift).
 */
export function sectionCollapseKey(marker: EditorLine, index: number): string {
  return marker.id ? `id:${marker.id}` : `idx:${index}`;
}

/**
 * old→new index map between two versions of the lines array, matched by line id (falling back
 * to object identity for id-less lines). -1 = the line no longer exists. Used for changes that
 * don't report their own map (undo/redo, inserts, deletes, raw edits).
 */
export function indexMapByIdentity(prev: EditorLine[], next: EditorLine[]): number[] {
  const newIndexOf = new Map<unknown, number>();
  next.forEach((line, j) => {
    const key = line?.id ? line.id : line;
    if (!newIndexOf.has(key)) newIndexOf.set(key, j);
  });
  return prev.map((line) => newIndexOf.get(line?.id ? line.id : line) ?? -1);
}

/** Apply an old→new index map to a set of line indices, dropping lines that disappeared. */
export function remapIndexSet(set: ReadonlySet<number>, indexMap: number[]): Set<number> {
  const out = new Set<number>();
  for (const i of set) {
    const j = indexMap[i];
    if (j != null && j >= 0) out.add(j);
  }
  return out;
}

/** Nesting level of a marker: 0 = main/root (depth 0), 1 = regular child (depth 1 or unset). */
function markerLevel(marker: EditorLine): number {
  return marker.depth === 0 ? 0 : 1;
}

/**
 * Exclusive end of the block a section marker governs: everything up to the next marker of the
 * same or higher level. A root's block therefore includes its child sections and their lines.
 */
export function sectionBlockEnd(lines: EditorLine[], markerIdx: number): number {
  const level = markerLevel(lines[markerIdx]);
  for (let j = markerIdx + 1; j < lines.length; j++) {
    if (lines[j]?.type === 'section' && markerLevel(lines[j]) <= level) return j;
  }
  return lines.length;
}

export type CollapsedView = {
  /** rows[r] = line index rendered at visual row r. */
  rows: number[];
  /** Inverse of rows; -1 = hidden inside a collapsed block. */
  rowOfLine: Int32Array;
  /** Visible collapsed headers → exclusive end of the block they hide. */
  collapsedHeaders: Map<number, number>;
  /** Every marker → number of lyric lines in its block (the collapsed "hidden lines" count). */
  blockLyricCounts: Map<number, number>;
};

/** Which lines are visible given the collapsed marker keys (view-only; lines are untouched). */
export function computeCollapsedView(lines: EditorLine[], collapsed: ReadonlySet<string>): CollapsedView {
  const n = lines.length;
  const lyricBefore = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) lyricBefore[i + 1] = lyricBefore[i] + (lines[i]?.type === 'section' ? 0 : 1);

  const rows: number[] = [];
  const rowOfLine = new Int32Array(n).fill(-1);
  const collapsedHeaders = new Map<number, number>();
  const blockLyricCounts = new Map<number, number>();
  let hideUntil = -1;
  for (let i = 0; i < n; i++) {
    const isMarker = lines[i]?.type === 'section';
    const end = isMarker ? sectionBlockEnd(lines, i) : -1;
    if (isMarker) blockLyricCounts.set(i, lyricBefore[end] - lyricBefore[i + 1]);
    if (i < hideUntil) continue;
    rowOfLine[i] = rows.length;
    rows.push(i);
    if (isMarker && end > i + 1 && collapsed.has(sectionCollapseKey(lines[i], i))) {
      collapsedHeaders.set(i, end);
      hideUntil = end;
    }
  }
  return { rows, rowOfLine, collapsedHeaders, blockLyricCounts };
}

/** Keys of every collapsed marker whose block contains `index` (its collapsed ancestors). */
export function collapsedAncestorKeys(lines: EditorLine[], collapsed: ReadonlySet<string>, index: number): string[] {
  const keys: string[] = [];
  for (let j = index - 1; j >= 0; j--) {
    if (lines[j]?.type !== 'section') continue;
    const key = sectionCollapseKey(lines[j], j);
    if (collapsed.has(key) && sectionBlockEnd(lines, j) > index) keys.push(key);
  }
  return keys;
}

/**
 * Move lines [start, end) as a unit onto `dropIndex` (a single line is a block of 1). Moving up
 * inserts before the target; moving down inserts after it — after its whole block when the
 * target is a collapsed header (`dropBlockEnd`). As with single-line drag, lyric timing slots
 * stay in place (lines are re-timed in their new order); markers keep their own fields.
 * `indexMap[old]` = new index.
 */
export function moveLineBlock(
  lines: EditorLine[],
  start: number,
  end: number,
  dropIndex: number,
  dropBlockEnd: number = dropIndex + 1,
): { lines: EditorLine[]; indexMap: number[] } {
  const identity = lines.map((_, i) => i);
  if (dropIndex >= start && dropIndex < end) return { lines, indexMap: identity };
  const k = end - start;
  const restIdx = identity.filter((i) => i < start || i >= end);
  const insertAt = dropIndex < start ? dropIndex : dropBlockEnd - k;
  const order = [...restIdx.slice(0, insertAt), ...identity.slice(start, end), ...restIdx.slice(insertAt)];

  const slots = lines.filter((l) => l.type !== 'section').map((l) => ({ timestamp: l.timestamp, endTime: l.endTime }));
  let slot = 0;
  const indexMap: number[] = new Array(lines.length).fill(-1);
  const next = order.map((oldIdx, newIdx) => {
    indexMap[oldIdx] = newIdx;
    const line = lines[oldIdx];
    return line.type === 'section' ? line : { ...line, ...slots[slot++] };
  });
  return { lines: next, indexMap };
}

/**
 * Given the flat lines array and a flat index, return {sectionIdx, lineIdx}
 * pointing into the sections structure that flatToSections() would produce.
 * Returns null if the index points to a section marker (not a regular line).
 */
export function flatIndexToSectionPos(lines: EditorLine[], flatIdx: number) {
  // Mirror flatToSections exactly: sections[0] is the implicit anonymous
  // section when lines start before any explicit section marker — those lines
  // must map to sectionIdx 0, not -1.
  let sectionCount = 0;   // sections pushed so far (= index of current section)
  let hasSection = false; // whether a section (implicit or explicit) has started
  let lineCounter = 0;

  for (let i = 0; i <= flatIdx; i++) {
    const line = lines[i];
    if (line?.type === 'section') {
      if (hasSection) sectionCount++; // complete previous section → next starts
      hasSection = true;
      lineCounter = 0;
      if (i === flatIdx) return null; // section marker itself — not patchable
    } else if (line) {
      if (!hasSection) hasSection = true; // implicit anonymous section[0]
      if (i === flatIdx) return { sectionIdx: sectionCount, lineIdx: lineCounter };
      lineCounter++;
    }
  }
  return null;
}

/**
 * Return the singers[] of the section that contains lines[lineIdx].
 * Used to restrict singer picker options to the parent section's roster.
 */
function getParentSectionSingers(lines: EditorLine[], lineIdx: number): string[] {
  for (let i = lineIdx; i >= 0; i--) {
    if (lines[i]?.type === 'section') {
      return Array.isArray(lines[i].singers) ? lines[i].singers as string[] : [];
    }
  }
  return [];
}

/**
 * Validate that all singers assigned to a line exist in their parent section.
 * Returns an array of invalid singer names (empty = valid).
 */
export function validateLineSingers(lines: EditorLine[], lineIdx: number): string[] {
  const line = lines[lineIdx];
  if (!line || !Array.isArray(line.singers) || line.singers.length === 0) return [];
  const allowed = new Set(getParentSectionSingers(lines, lineIdx));
  if (allowed.size === 0) return []; // section has no singer roster → no restriction
  return (line.singers as string[]).filter((s) => !allowed.has(s));
}

/**
 * Singer options to offer for a bulk-assignment picker covering `indices`.
 * Restricts to the parent section's roster only when every selected line
 * shares the same non-empty roster — a mixed selection can't be restricted
 * to a single roster safely, so it falls back to the full song-wide list.
 */
export function getSingerOptionsForSelection(lines: EditorLine[], indices: number[], songArtists?: string[]) {
  const rosters = indices.map((idx) => getParentSectionSingers(lines, idx));
  const first = rosters[0] || [];
  if (first.length === 0) return songArtists || [];
  const sameForAll = rosters.every((r) => r.length === first.length && r.every((s: string, i: number) => s === first[i]));
  return sameForAll ? first : (songArtists || []);
}

/**
 * Raw-text syntax (editor "Raw Lyrics" modal and setup lyrics textarea):
 *
 *   [Verse 1]              section header (indented = regular depth 1, flush = main depth 0)
 *   [Chorus | Mira, Theo]  section with a singer roster (canonical form; `[Chorus: Mira & Theo]`
 *                          Genius-style is also accepted on input)
 *   []                     unlabeled section (`[ | Mira]` = unlabeled with singers)
 *   Mira: some lyric       line sung by Mira; `Mira & Theo: …` for several singers. Only
 *                          recognized when EVERY name is in the project's singer roster, so a
 *                          lyric like "Note: …" or "Baby: …" is never misread.
 *   \[not a header]        a leading backslash makes the rest of the line literal lyric text.
 *
 * linesToRawText and parseRawTextLine are exact inverses for label (modulo title-casing),
 * depth 0/1, section/line singers and text, given the same roster.
 */
const MAX_LINE_SINGERS = 4;

/** Serialized text of a lyric line's body: ruby markup when it has readings, else the text. */
export function rawLineText(line: EditorLine): string {
  return serializeToRubyMarkup(line.words) || (line.text as string | undefined) || '';
}

function resolveRosterName(name: string, roster: readonly string[]): string | null {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  return roster.find((r) => r.trim().toLowerCase() === key) ?? null;
}

/**
 * `Mira: text` / `Mira & Theo: text` → { singers, rest }, or null when the prefix is not made
 * exclusively of roster names (conservative: unknown names stay part of the lyric).
 */
export function parseSingerPrefix(line: string, roster: readonly string[]): { singers: string[]; rest: string } | null {
  if (roster.length === 0) return null;
  const m = line.match(/^([^:]+?):(?:\s+|$)(.*)$/);
  if (!m) return null;
  const whole = resolveRosterName(m[1], roster);
  let singers: string[];
  if (whole) {
    singers = [whole];
  } else {
    const parts = m[1].split(/\s*(?:,|&)\s*/);
    const resolved = parts.map((p) => resolveRosterName(p, roster));
    if (resolved.some((r) => r == null)) return null;
    singers = [...new Set(resolved as string[])];
  }
  return { singers: singers.slice(0, MAX_LINE_SINGERS), rest: m[2] };
}

export type RawTextItem =
  | { kind: 'section'; label: string; singers: string[]; depth: number }
  | { kind: 'line'; text: string; singers?: string[] };

/** Classify one raw textarea line (inverse of the per-line output of linesToRawText). */
export function parseRawTextLine(rawLine: string, roster: readonly string[] = []): RawTextItem {
  const header = parseSectionHeader(rawLine);
  if (header) return { kind: 'section', ...header };
  const trimmed = (rawLine ?? '').trim();
  if (trimmed.startsWith('\\')) return { kind: 'line', text: trimmed.slice(1) };
  const prefix = parseSingerPrefix(trimmed, roster);
  if (prefix) return { kind: 'line', text: prefix.rest, singers: prefix.singers };
  return { kind: 'line', text: trimmed };
}

/**
 * Editor flat lines → raw textarea text (see the syntax above). Every line and every section
 * marker (including unlabeled ones) is emitted, so the round-trip keeps the line count and
 * therefore every timestamp in place. Section names are capitalized via
 * formatSectionLabelForSerialization (`[Verse]`, not `[verse]`).
 *
 * @param lineText serializer for a lyric line's body (e.g. ruby markup). Defaults to `line.text`.
 * @param roster   singer roster; decides which `Name:` prefixes the parser will recognize, so
 *                 lyric text that would be misread as a prefix gets escaped.
 */
export function linesToRawText(
  lines: EditorLine[],
  lineText: (line: EditorLine) => string = (l) => (l.text as string | undefined) ?? '',
  roster: readonly string[] = [],
): string {
  const out: string[] = [];
  let currentDepth = 0;

  for (const line of lines ?? []) {
    if (line?.type === 'section') {
      const label = ((line.label as string | undefined) ?? '').trim();
      const singers = Array.isArray(line.singers) ? (line.singers as string[]).filter(Boolean) : [];
      currentDepth = (line.depth as number) ?? 1;
      const display = formatSectionLabelForSerialization(label);
      const indent = currentDepth > 0 ? '  ' : '';
      out.push(singers.length ? `${indent}[${display} | ${singers.join(', ')}]` : `${indent}[${display}]`);
      continue;
    }
    const indent = currentDepth > 0 ? '  ' : '';
    const textStr = lineText(line);
    const singers = Array.isArray(line.singers) ? line.singers.filter(Boolean) : [];
    let body: string;
    if (singers.length) {
      body = `${singers.join(' & ')}: ${textStr}`;
    } else if (textStr.startsWith('\\') || textStr.startsWith('[') || parseSingerPrefix(textStr, roster)) {
      body = `\\${textStr}`; // would otherwise parse as a header / singer prefix / LRC import
    } else {
      body = textStr;
    }
    // Don't indent blank lines
    out.push(body.trim() ? `${indent}${body}` : body);
  }

  return out.join('\n');
}

/** Alignment key for a flat editor line (section marker or lyric), see alignRawTextItems. */
export function rawTextKeyOfLine(line: EditorLine): string {
  return line?.type === 'section'
    ? `S${formatSectionLabelForSerialization(((line.label as string | undefined) ?? '').trim()).toLowerCase()}`
    : `L${rawLineText(line)}`;
}

/** Alignment key for a parsed raw-text item, comparable with rawTextKeyOfLine. */
export function rawTextKeyOfItem(item: RawTextItem): string {
  return item.kind === 'section' ? `S${item.label.toLowerCase()}` : `L${item.text}`;
}

// LCS table cap (cells). Above it, alignment falls back to in-order pairing only.
const MAX_LCS_CELLS = 4_000_000;

/**
 * For each `next` key, the index of the `prior` item it continues (or -1 for a new item).
 * Identical keys are matched via longest-common-subsequence so inserting or deleting a line in
 * the raw text doesn't shift the timing of every following line. Unmatched items between two
 * matches are paired in order with unmatched prior items of the same kind (first key char), so
 * editing a line's text in place still keeps its timestamp — the previous ordinal behaviour.
 */
export function alignRawTextItems(prior: string[], next: string[]): number[] {
  const result: number[] = new Array(next.length).fill(-1);
  let start = 0;
  while (start < prior.length && start < next.length && prior[start] === next[start]) {
    result[start] = start;
    start++;
  }
  let pe = prior.length;
  let ne = next.length;
  while (pe > start && ne > start && prior[pe - 1] === next[ne - 1]) {
    pe--; ne--;
    result[ne] = pe;
  }

  const anchors: Array<[number, number]> = [];
  const n = pe - start;
  const m = ne - start;
  if (n > 0 && m > 0 && (n + 1) * (m + 1) <= MAX_LCS_CELLS) {
    const w = m + 1;
    const dp = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * w + j] = prior[start + i] === next[start + j]
          ? dp[(i + 1) * w + j + 1] + 1
          : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (prior[start + i] === next[start + j]) {
        anchors.push([start + i, start + j]);
        i++; j++;
      } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
        i++;
      } else {
        j++;
      }
    }
  }

  const pairGap = (pFrom: number, pTo: number, nFrom: number, nTo: number) => {
    const pending: Record<string, number[]> = {};
    for (let p = pFrom; p < pTo; p++) (pending[prior[p][0]] ??= []).push(p);
    for (let k = nFrom; k < nTo; k++) {
      const queue = pending[next[k][0]];
      if (queue?.length) result[k] = queue.shift() as number;
    }
  };
  let pi = start;
  let ni = start;
  for (const [a, b] of anchors) {
    pairGap(pi, a, ni, b);
    result[b] = a;
    pi = a + 1;
    ni = b + 1;
  }
  pairGap(pi, pe, ni, ne);
  return result;
}

// LRC timestamp shape, e.g. [00:12.50] — must NOT be treated as a section header.
const LRC_TIMESTAMP = /^\d{1,2}:\d{2}(?:\.\d{1,3})?$/;

/**
 * Raw textarea line → section header parts, or null if the line is not a header.
 * Header forms: `[Label]`, `[Label | A, B]`, `[Label: A & B]`, `[]` (unlabeled).
 */
export function parseSectionHeader(rawLine: string): { label: string; singers: string[]; depth: number } | null {
  const leadingSpacesMatch = (rawLine ?? '').match(/^\s*/);
  const leadingSpaces = leadingSpacesMatch ? leadingSpacesMatch[0].length : 0;

  const trimmed = (rawLine ?? '').trim();
  const m = trimmed.match(/^\[([^\]]*)\]$/);
  if (!m) return null;
  const pipe = m[1].indexOf('|');
  const inner = (pipe >= 0 ? m[1].slice(0, pipe) : m[1]).trim();
  if (LRC_TIMESTAMP.test(inner)) return null; // [00:12.50] is a timestamp, not a section

  let label = inner;
  let singers = pipe >= 0 ? m[1].slice(pipe + 1).split(',').map((s) => s.trim()).filter(Boolean) : [];

  // Genius-style `[Section: Singer & Singer]` form. Split the colon into a singer
  // roster for every label EXCEPT structural dividers — `[Part I: NO SALVATION...]`
  // keeps the colon as part of its title.
  if (singers.length === 0) {
    const colon = inner.match(/^(.+?):\s*(.+)$/);
    if (colon && !isStructuralSection(colon[1])) {
      label = colon[1].trim();
      singers = colon[2].split(/[,&]/).map((s) => s.trim()).filter(Boolean);
    }
  }

  // Depth 0 for unindented, depth 1 for indented
  const depth = leadingSpaces > 0 ? 1 : 0;

  return { label, singers, depth };
}

/**
 * Applies a new section label and/or singers to the selected lyric lines by manipulating
 * `type: 'section'` markers. Modifies the array to wrap the selected lines in the new state,
 * and restores the original state for lines following the selection.
 *
 * Markers are inserted/dropped, so indices shift: `indexMap[oldIndex]` is the line's new
 * index (-1 for a dropped marker). Callers must remap index-based state (selection, active line).
 */
export function applyTagToSelection(
  lines: EditorLine[],
  selectedIndices: Set<number>,
  tag: { label?: string; singers?: string[] }
): { lines: EditorLine[]; indexMap: number[] } {
  if (selectedIndices.size === 0) return { lines, indexMap: lines.map((_, i) => i) };

  const updated: EditorLine[] = [];
  // Tagging a subset of a section splits it: the original marker is re-emitted after the
  // selection to restore the tail's state. Every emitted marker must keep a unique id —
  // ids are React keys in the editor list and preview numbering keys.
  const emittedMarkerIds = new Set<unknown>();
  const pushMarker = (marker: EditorLine) => {
    const needsFreshId = marker.id != null && emittedMarkerIds.has(marker.id);
    const out = needsFreshId ? { ...marker, id: crypto.randomUUID() } : marker;
    if (out.id != null) emittedMarkerIds.add(out.id);
    updated.push(out);
  };

  // indexMap[old] = new index of that line/marker in `updated` (-1 when a marker was dropped).
  // Lets callers carry the selection / active line across the tag operation.
  const indexMap: number[] = new Array(lines.length).fill(-1);

  let originalState = { label: undefined as string | undefined, singers: undefined as string[] | undefined, depth: undefined as number | undefined, marker: undefined as EditorLine | undefined, markerIndex: -1 };
  let currentOutputState = { label: undefined as string | undefined, singers: undefined as string[] | undefined, depth: undefined as number | undefined };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line?.type === 'section') {
      originalState = {
        label: line.label,
        singers: Array.isArray(line.singers) ? [...line.singers] : undefined,
        depth: line.depth as number | undefined,
        marker: line,
        markerIndex: i,
      };

      if (selectedIndices.has(i)) {
        const newLabel = tag.label !== undefined ? tag.label : line.label;
        const newSingers = tag.singers !== undefined ? tag.singers : line.singers;
        indexMap[i] = updated.length;
        pushMarker({ ...line, label: newLabel, singers: newSingers });
        currentOutputState = { label: newLabel, singers: newSingers, depth: originalState.depth };
      } else {
        // Keep empty section markers if they represent the very end of the file
        if (i === lines.length - 1) {
          indexMap[i] = updated.length;
          pushMarker(line);
        }
      }
    } else {
      const isSelected = selectedIndices.has(i);
      const intendedState = isSelected ? {
        label: tag.label !== undefined ? tag.label : originalState.label,
        singers: tag.singers !== undefined ? tag.singers : originalState.singers,
        depth: originalState.depth
      } : originalState;

      const stateChanged = 
        intendedState.label !== currentOutputState.label ||
        JSON.stringify(intendedState.singers) !== JSON.stringify(currentOutputState.singers);

      if (stateChanged) {
        if (
          originalState.marker &&
          originalState.marker.label === intendedState.label &&
          JSON.stringify(originalState.marker.singers) === JSON.stringify(intendedState.singers)
        ) {
           // First re-emission of an unselected original marker is "that" marker.
           if (indexMap[originalState.markerIndex] === -1) indexMap[originalState.markerIndex] = updated.length;
           pushMarker(originalState.marker);
        } else {
           pushMarker({
             type: 'section',
             label: intendedState.label,
             singers: intendedState.singers,
             depth: intendedState.depth ?? 1,
             timestamp: null,
             id: crypto.randomUUID()
           });
        }
        currentOutputState = intendedState;
      }

      indexMap[i] = updated.length;
      updated.push(line);
    }
  }

  return { lines: updated, indexMap };
}
