import type { EditorLine } from '@/features/editor/editor.types';

/** Two edges closer than this count as the same instant. */
const SAME = 0.005;

/** The first line after `index` that has a time, or -1. Sections carry none, so they are skipped. */
export function nextTimedIndex(lines: EditorLine[], index: number): number {
  for (let i = index + 1; i < lines.length; i++) {
    if (lines[i].type !== 'section' && lines[i].timestamp != null) return i;
  }
  return -1;
}

/** The last line before `index` that has a time, or -1. */
export function prevTimedIndex(lines: EditorLine[], index: number): number {
  for (let i = index - 1; i >= 0; i--) {
    if (lines[i].type !== 'section' && lines[i].timestamp != null) return i;
  }
  return -1;
}

/**
 * Where a line stops when nothing says otherwise: its own end time, else the start of the next
 * timed line, else the end of the track.
 */
export function naturalLineEnd(lines: EditorLine[], index: number, duration?: number | null): number | null {
  const line = lines[index];
  if (!line) return null;
  if (line.endTime != null) return line.endTime;
  const next = nextTimedIndex(lines, index);
  return next >= 0 ? (lines[next].timestamp as number) : duration ?? null;
}

/** The end of the line's last word when that word is timed and was given one, else null. */
export function tailWordEnd(line: EditorLine | undefined): number | null {
/** What the checks on a line's last word read: enough for the editor's lines and the viewers' alike. */
interface TailLine {
  timestamp?: number | null;
  adLibOf?: number | null;
  words?: { time?: number | null; end?: number | null }[];
}

/** The end of the line's last word when that word is timed and was given one, else null. */
export function tailWordEnd(line: TailLine | undefined): number | null {
  const last = line?.words?.[line.words.length - 1];
  return last && last.time != null && last.end != null && last.end > last.time ? last.end : null;
}

/**
 * Where a line really stops sounding: its natural end, or later when its last word is held past
 * it (the singer is still on that word while the next line has begun).
 */
export function lineSpanEnd(lines: EditorLine[], index: number, duration?: number | null): number | null {
  const natural = naturalLineEnd(lines, index, duration);
  const tail = tailWordEnd(lines[index]);
  if (natural == null) return tail;
  return tail != null && tail > natural ? tail : natural;
}

/** The next line this one is still sounding over, and for how long; null when they do not overlap. */
export function lineOverlap(lines: EditorLine[], index: number): { nextIndex: number; seconds: number } | null {
  const tail = tailWordEnd(lines[index]);
  if (tail == null) return null;
  const nextIndex = nextTimedIndex(lines, index);
  if (nextIndex < 0) return null;
  const seconds = tail - (lines[nextIndex].timestamp as number);
  return seconds > SAME ? { nextIndex, seconds } : null;
}

/**
 * Until when a line goes on sounding after the next one has started, because its last word is
 * held over it; null when it stops where the next line starts. Counterparts have their own rule.
 */
export function heldUntil(line: TailLine | undefined, nextStart: number | null | undefined): number | null {
  if (!line || nextStart == null || line.adLibOf != null) return null;
  const tail = tailWordEnd(line);
  return tail != null && tail - nextStart > SAME ? tail : null;
}

/** Whether the line is still sounding at `position` although the next one has already started. */
export function isHeldAt(line: TailLine | undefined, nextStart: number | null | undefined, position: number | null | undefined): boolean {
  if (position == null || nextStart == null || position < nextStart) return false;
  const until = heldUntil(line, nextStart);
  return until != null && position < until;
}

export interface LineBand {
  /** Index of the line in the editor's list. */
  index: number;
  /** Its number among the lyric lines, as the editor shows it. */
  number: number;
  text: string;
  from: number;
  to: number;
  /** 0 or 1: a band that starts while the one before it still sounds drops to the other lane. */
  lane: 0 | 1;
}

/** Every timed lyric line as a band in time, on two lanes so overlapping lines sit side by side. */
export function lineBands(lines: EditorLine[], duration?: number | null): LineBand[] {
  const bands: LineBand[] = [];
  const laneEnd = [-Infinity, -Infinity];
  let number = 0;
  lines.forEach((line, index) => {
    if (line.type === 'section') return;
    number++;
    if (line.timestamp == null || !line.text?.trim()) return;
    const from = line.timestamp;
    const to = lineSpanEnd(lines, index, duration) ?? from;
    if (to <= from) return;
    const lane: 0 | 1 = from >= laneEnd[0] - SAME ? 0 : from >= laneEnd[1] - SAME ? 1 : laneEnd[0] <= laneEnd[1] ? 0 : 1;
    laneEnd[lane] = to;
    bands.push({ index, number, text: line.text, from, to, lane });
  });
  return bands;
}
