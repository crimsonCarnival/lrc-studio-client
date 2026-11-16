import type { EditorLine } from '@/features/editor/editor.types';
import type { SingerLabel } from '@/features/assist/assist.types';
import { normalizeLineMode } from '@/features/editor/services/editor.service';
import { sentIndexResolver } from './sent-lines';

const sameSingers = (a: readonly string[] | undefined, b: readonly string[]): boolean =>
  (a?.length ?? 0) === b.length && b.every((s, i) => a?.[i] === s);

/**
 * Whether a label would change `line`. Never for a section marker, a label with no singers (the
 * model has no opinion; labelling never removes singers), a line whose words are attributed to a
 * singer one by one (hand-made split lines), or a line that already has exactly these singers.
 */
export function singerLabelChanges(line: EditorLine, singers: readonly string[]): boolean {
  if (line.type === 'section' || !singers.length) return false;
  if (line.words?.some((w) => w.singerIndex != null)) return false;
  return !sameSingers(line.singers, singers);
}

/**
 * Writes suggested singers onto the lines. `labels[k].lineIndex` indexes `opened`, the main lines
 * as they were sent, and is matched back to `lines` by id or identity (never by position), so
 * lines inserted, deleted or moved while the request was in flight are not mis-labelled. `mode`
 * follows the singer count. Returns `lines` itself when nothing changed.
 */
export function applySingerLabels(
  lines: EditorLine[],
  labels: readonly SingerLabel[],
  opened: readonly EditorLine[],
): { lines: EditorLine[]; changed: number[] } {
  const byOpened = new Map<number, string[]>();
  for (const l of labels) byOpened.set(l.lineIndex, l.singers);
  const openedIndexOf = sentIndexResolver(opened);
  const changed: number[] = [];
  const next = lines.map((line, lineIndex) => {
    const n = openedIndexOf(line);
    const singers = n === undefined ? undefined : byOpened.get(n);
    if (!singers || !singerLabelChanges(line, singers)) return line;
    changed.push(lineIndex);
    const labelled = { ...line, singers: [...singers] };
    return { ...labelled, mode: normalizeLineMode(labelled) };
  });
  return { lines: changed.length ? next : lines, changed };
}
