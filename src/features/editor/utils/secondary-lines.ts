import type { EditorLine } from '@/features/editor/editor.types';

/** Indices (into the flat list) of the lines a secondary lyric can attach to: every non-section line. */
export function mainLineIndices(lines: EditorLine[]): number[] {
  const out: number[] = [];
  lines.forEach((line, i) => { if (line.type !== 'section') out.push(i); });
  return out;
}

/** One secondary per main line, newline-separated, so the bulk editor opens on what is already there. */
export function secondaryText(lines: EditorLine[]): string {
  return mainLineIndices(lines).map((i) => lines[i].secondary ?? '').join('\n');
}

/**
 * Pairs pasted text with the main lines by position: text line N is the secondary of
 * main line N, and a blank text line clears it. Positional (rather than skipping blank
 * lines) so a blank can mean "this line has none" and the editor round-trips exactly.
 */
export function splitSecondaryText(raw: string): string[] {
  return raw.replace(/\r\n?/g, '\n').split('\n').map((s) => s.trim());
}

/**
 * Writes `values` onto the main lines in order. Values past the last main line are
 * ignored; the caller is expected to refuse that case before getting here.
 *
 * A changed secondary drops `secondaryWords`: they were tokenized (and possibly
 * stamped) from the old text, and the LRC export prefers timed secondaryWords over
 * `secondary`, so keeping them would export the old romaji.
 */
export function applySecondaryLines(lines: EditorLine[], values: string[]): { lines: EditorLine[]; changed: number[] } {
  const changed: number[] = [];
  const mains = mainLineIndices(lines);
  const next = [...lines];
  mains.forEach((lineIndex, n) => {
    const value = values[n] || undefined;
    const line = lines[lineIndex];
    if ((line.secondary || undefined) === value) return;
    const { secondaryWords: _stale, ...rest } = line;
    next[lineIndex] = { ...rest, secondary: value };
    changed.push(lineIndex);
  });
  return { lines: changed.length ? next : lines, changed };
}
