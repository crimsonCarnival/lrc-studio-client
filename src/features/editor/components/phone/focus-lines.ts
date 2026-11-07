import type { EditorLine } from '@/features/editor/editor.types';

export type FocusLines = { previous: string | null; current: string | null; next: string | null };

/**
 * The lyric lines around the cursor for the Focus view. Section markers are skipped: they
 * are not stamped. When the cursor rests on a marker, the current line is the next lyric.
 */
export function focusLines(lines: EditorLine[], activeIndex: number): FocusLines {
  const isLyric = (i: number) => lines[i] != null && lines[i].type !== 'section';
  let cur = Math.max(0, activeIndex);
  while (cur < lines.length && !isLyric(cur)) cur++;
  let prev = Math.min(activeIndex, lines.length) - 1;
  if (cur < lines.length) prev = cur - 1;
  while (prev >= 0 && !isLyric(prev)) prev--;
  let next = cur + 1;
  while (next < lines.length && !isLyric(next)) next++;
  const text = (i: number) => (i >= 0 && i < lines.length && isLyric(i) ? (lines[i].text ?? '') : null);
  return { previous: text(prev), current: text(cur), next: text(next) };
}
