import type { EditorLine } from '@/features/editor/editor.types';

/**
 * Seconds of the song that synced lyric lines cover. A line runs from its start to its own end
 * time, else to the next timed line's start, else to the end of the song. Overlapping spans
 * (counterparts, out-of-order times) count once, and everything is clipped to [0, duration].
 */
export function syncedCoverage(lines: EditorLine[], duration: number): number {
  if (!(duration > 0)) return 0;
  const starts = lines
    .filter((l) => l.type !== 'section' && l.timestamp != null)
    .map((l) => l.timestamp as number)
    .sort((a, b) => a - b);
  const spans: [number, number][] = [];
  for (const line of lines) {
    if (line.type === 'section' || line.timestamp == null) continue;
    const start = Math.max(0, line.timestamp);
    const next = starts.find((s) => s > line.timestamp!);
    const end = Math.min(duration, line.endTime ?? next ?? duration);
    if (end > start) spans.push([start, end]);
  }
  spans.sort((a, b) => a[0] - b[0]);
  let covered = 0;
  let reach = -Infinity;
  for (const [start, end] of spans) {
    if (end <= reach) continue;
    covered += end - Math.max(start, reach);
    reach = end;
  }
  return covered;
}
