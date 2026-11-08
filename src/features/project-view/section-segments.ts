import type { EditorLine } from '@/features/editor/editor.types';

export type SectionSegment = {
  label: string | null;
  start: number;
  end: number;
};

const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/**
 * Cuts the track into one segment per lyric section, for the phone progress string.
 *
 * A section starts at its first timed lyric line (ad-lib counterparts do not count);
 * a section with no timed line is skipped. Starts must strictly increase: a section
 * that begins at or before the previous one, or at or after the end of the track, is
 * dropped. The first segment always starts at 0 (timed lines before the first marker
 * make an unnamed lead segment), and the last one ends at `duration`.
 * A song with no usable sections is one unnamed segment; an unknown duration gives none.
 */
export function buildSectionSegments(lines: EditorLine[], duration: number): SectionSegment[] {
  if (!(duration > 0) || !Number.isFinite(duration)) return [];

  const starts: { label: string | null; start: number }[] = [];
  let label: string | null = null;
  let seenSection = false;
  let placed = true; // timed lines before the first marker open the unnamed lead

  for (const line of lines) {
    if (line.type === 'section') {
      label = line.label || null;
      seenSection = true;
      placed = false;
      continue;
    }
    if (!isTime(line.timestamp) || line.adLibOf != null || placed) {
      if (!seenSection && isTime(line.timestamp) && line.adLibOf == null && starts.length === 0) {
        starts.push({ label: null, start: line.timestamp });
        placed = true;
      }
      continue;
    }
    starts.push({ label, start: line.timestamp });
    placed = true;
  }

  const kept: { label: string | null; start: number }[] = [];
  for (const s of starts) {
    const prev = kept[kept.length - 1];
    if (s.start >= duration || (prev && s.start <= prev.start)) continue;
    kept.push(s);
  }

  if (kept.length === 0) return [{ label: null, start: 0, end: duration }];
  kept[0] = { ...kept[0], start: 0 };
  return kept.map((s, i) => ({ ...s, end: kept[i + 1]?.start ?? duration }));
}

/** The segment the playhead is in; the last one once it reaches the end. */
export function segmentAt(segments: SectionSegment[], time: number): SectionSegment | null {
  if (segments.length === 0) return null;
  return segments.find((s) => time >= s.start && time < s.end) ?? segments[segments.length - 1];
}
