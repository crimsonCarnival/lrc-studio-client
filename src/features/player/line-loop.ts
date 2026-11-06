import type { EditorLine } from '@/features/editor/editor.types';

/**
 * A-B loop bounds for the timed line playing at `now`: from its start to its own end
 * time, else to the next timed line's start, else to the end of the song. Null before
 * the first timed line, when there is nothing to loop.
 */
export function lineLoopAt(lines: EditorLine[], now: number, duration: number): { a: number; b: number } | null {
  let activeIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const ts = lines[i].timestamp;
    if (ts != null && ts <= now) activeIdx = i;
  }
  if (activeIdx < 0) return null;
  const a = lines[activeIdx].timestamp as number;
  let b = lines[activeIdx].endTime ?? null;
  if (b == null) {
    b = duration;
    for (let i = activeIdx + 1; i < lines.length; i++) {
      const ts = lines[i].timestamp;
      if (ts != null) { b = ts; break; }
    }
  }
  return { a, b };
}
