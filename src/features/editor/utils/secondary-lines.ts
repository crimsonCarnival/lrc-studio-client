import type { EditorLine } from '@/features/editor/editor.types';
import { sentIndexResolver } from './sent-lines';

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
 * Writes `values` onto the main lines. `values[n]` belongs to `opened[n]`, the main
 * lines as they were when the bulk editor opened (default: the main lines of
 * `lines`), and is matched back to `lines` by id or identity, never by position.
 * So while the editor is open a collaborator may insert, delete or move lines:
 * a line that is gone is skipped, a line added since is left alone, and a value
 * the user did not change (equal to what the line had at open) is not written, so
 * a secondary someone else edited meanwhile stands. Values past `opened` are ignored.
 *
 * A changed secondary drops `secondaryWords`: they were tokenized (and possibly
 * stamped) from the old text, and the LRC export prefers timed secondaryWords over
 * `secondary`, so keeping them would export the old romaji.
 */
export function applySecondaryLines(
  lines: EditorLine[],
  values: string[],
  opened: EditorLine[] = mainLineIndices(lines).map((i) => lines[i]),
): { lines: EditorLine[]; changed: number[] } {
  const changed: number[] = [];
  const openedIndexOf = sentIndexResolver(opened);
  const next = lines.map((line, lineIndex) => {
    if (line.type === 'section') return line;
    const n = openedIndexOf(line);
    if (n === undefined) return line;
    const value = values[n] || undefined;
    if ((opened[n].secondary || undefined) === value) return line;
    if ((line.secondary || undefined) === value) return line;
    const { secondaryWords: _stale, ...rest } = line;
    changed.push(lineIndex);
    return { ...rest, secondary: value };
  });
  return { lines: changed.length ? next : lines, changed };
}
