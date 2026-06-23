/**
 * Conversion between the flat internal editor representation (lines[]) and
 * the nested DB representation (sections[]).
 *
 * Flat format: [{type:'section', label, depth, singers, ...}, {text,...}, ...]
 * Nested format: [{label, depth, singers, lines:[{text,...},...]}]
 */
import type { EditorLine } from '@/features/editor/services/editor.service';
import { formatSectionLabelForSerialization, isIntroLabel } from '@/features/editor/constants/sectionTypes';

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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { type: _t, label: _l, depth: _d, furigana: _f, ...rest } = line;
      current.lines.push(rest as EditorLine);
    }
  }
  if (current) sections.push(current);
  return sections;
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
        depth: sec.depth ?? null,
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
 * Editor flat lines → raw textarea text. Reconstructs `[Label: A, B]` section headers
 * so the editor → text → editor round-trip preserves section structure. Section names are
 * capitalized via formatSectionLabelForSerialization (`[Verse: A]`, not `[verse: A]`).
 *
 * Intro sections are editor-only metadata: their header AND their body lines are omitted
 * entirely from the raw text (so a round-trip through the textarea drops the intro).
 *
 * @param lineText optional serializer for non-section lines (e.g. ruby markup). Defaults to `line.text`.
 */
export function linesToRawText(
  lines: EditorLine[],
  lineText: (line: EditorLine) => string = (l) => (l.text as string | undefined) ?? '',
): string {
  const out: string[] = [];
  let currentDepth = 0;

  for (const line of lines ?? []) {
    if (line?.type === 'section') {
      currentDepth = (line.depth as number) ?? 1;
      const label = ((line.label as string | undefined) ?? '').trim();
      const singers = Array.isArray(line.singers) ? (line.singers as string[]).filter(Boolean) : [];
      if (!label && singers.length === 0) {
        out.push(''); // anonymous marker → blank line
        continue;
      }
      const display = formatSectionLabelForSerialization(label);
      const indent = currentDepth > 0 ? '  ' : '';
      out.push(singers.length ? `${indent}[${display} | ${singers.join(', ')}]` : `${indent}[${display}]`);
      continue;
    }
    const indent = currentDepth > 0 ? '  ' : '';
    const textStr = lineText(line);
    // Don't indent blank lines
    out.push(textStr.trim() ? `${indent}${textStr}` : textStr);
  }

  return out.join('\n');
}

// LRC timestamp shape, e.g. [00:12.50] — must NOT be treated as a section header.
const LRC_TIMESTAMP = /^\d{1,2}:\d{2}(?:\.\d{1,3})?$/;

/**
 * Raw textarea line → section header parts, or null if the line is not a header.
 * Header form: `[Label]` or `[Label: A, B]` (comma-separated singers).
 */
export function parseSectionHeader(rawLine: string): { label: string; singers: string[]; depth: number } | null {
  const leadingSpacesMatch = (rawLine ?? '').match(/^\s*/);
  const leadingSpaces = leadingSpacesMatch ? leadingSpacesMatch[0].length : 0;
  
  const trimmed = (rawLine ?? '').trim();
  const m = trimmed.match(/^\[(.+?)(?:\s*\|\s*(.+))?\]$/);
  if (!m) return null;
  const inner = m[1].trim();
  if (LRC_TIMESTAMP.test(inner)) return null; // [00:12.50] is a timestamp, not a section
  const singers = m[2] ? m[2].split(',').map((s) => s.trim()).filter(Boolean) : [];
  
  // Depth 0 for unindented, depth 1 for indented
  const depth = leadingSpaces > 0 ? 1 : 0;
  
  return { label: inner, singers, depth };
}
