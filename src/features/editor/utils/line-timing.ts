import type { EditorLine, EditorWord } from '@/features/editor/editor.types';
import { alignLineStart } from '@/features/editor/services/editor.service';
import { naturalLineEnd, nextTimedIndex, prevTimedIndex } from './line-span';

/** Smallest distance kept between two edges of the same line, and between two lines' starts. */
const GAP = 0.02;
/** Two edges closer than this count as the same instant. */
const SAME = 0.005;

/**
 * One change to when a whole line sounds, made from the line's chip in the lines lane:
 * - `start`: only where the line begins (its first word's start); the rest of the line stays.
 * - `end`: only where the line stops (its last word's end); nothing else moves.
 * - `move`: the whole line, every word with it, so that it begins at `start`.
 */
export type LineTimingEdit =
  | { kind: 'start'; time: number }
  | { kind: 'end'; time: number }
  | { kind: 'move'; start: number };

const round = (n: number) => Number(n.toFixed(3));
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(Math.max(min, max), n));

const shiftWords = (words: EditorWord[] | undefined, delta: number): EditorWord[] | undefined => words?.map((w) => ({
  ...w,
  ...(w.time != null ? { time: round(w.time + delta) } : {}),
  ...(w.end != null ? { end: round(w.end + delta) } : {}),
}));

/**
 * Applies one timing edit to one line and nothing else: another line's start or end is never
 * touched. A line cannot start before the line before it has, nor after the line after it
 * (their order is kept), and its own words stay in order. The end may go anywhere after the
 * last word starts, including past the start of the next line (the two then overlap).
 *
 * Returns `lines` itself when the edit changes nothing.
 */
export function applyLineTiming(lines: EditorLine[], index: number, edit: LineTimingEdit, duration?: number | null): EditorLine[] {
  const line = lines[index];
  // A counterpart is placed against its parent line, not against its neighbours in the list.
  if (!line || line.type === 'section' || line.timestamp == null || line.adLibOf != null) return lines;

  const prevIndex = prevTimedIndex(lines, index);
  const nextIndex = nextTimedIndex(lines, index);
  const floor = prevIndex >= 0 ? (lines[prevIndex].timestamp as number) + GAP : 0;
  const ceil = nextIndex >= 0 ? (lines[nextIndex].timestamp as number) - GAP : Infinity;
  const words = line.words ?? [];
  const timed = words.map((w, i) => ({ w, i })).filter(({ w }) => w.time != null);
  const apply = (next: EditorLine): EditorLine[] => {
    const out = [...lines];
    out[index] = next;
    return out;
  };

  if (edit.kind === 'start') {
    // As late as the second timed word allows, or as the line's end when it has only one.
    const second = timed[1]?.w.time ?? null;
    const own = second ?? line.endTime ?? words[words.length - 1]?.end ?? null;
    const time = round(clamp(edit.time, floor, Math.min(ceil, own != null ? own - GAP : Infinity)));
    if (time === line.timestamp && words[0]?.time === time) return lines;
    const moved: EditorLine = {
      ...line,
      source: 'manual',
      words: words.length
        ? words.map((w, i) => {
          // An end the new start has passed no longer means anything: the word runs on again.
          if (i === 0 && w.end != null && w.end <= time) return { ...w, end: null };
          return w;
        })
        : line.words,
    };
    return apply(alignLineStart(moved, time));
  }

  if (edit.kind === 'move') {
    const start = round(clamp(edit.start, floor, ceil));
    const delta = round(start - line.timestamp);
    if (delta === 0) return lines;
    return apply({
      ...line,
      source: 'manual',
      timestamp: start,
      ...(line.endTime != null ? { endTime: round(line.endTime + delta) } : {}),
      ...(line.words ? { words: shiftWords(line.words, delta) } : {}),
      ...(line.secondaryWords ? { secondaryWords: shiftWords(line.secondaryWords, delta) } : {}),
    });
  }

  // end
  const last = timed[timed.length - 1];
  const after = (last?.w.time ?? line.timestamp) + GAP;
  const time = round(clamp(edit.time, after, duration != null && duration > after ? duration : Infinity));
  // A line with an end time of its own keeps it there.
  if (line.endTime != null) {
    if (time === line.endTime) return lines;
    return apply({
      ...line,
      endTime: time,
      ...(last && last.w.end != null && last.w.end > time ? { words: words.map((w, i) => (i === last.i ? { ...w, end: null } : w)) } : {}),
    });
  }
  if (!last) return apply({ ...line, endTime: time });
  // Back at the start of the next line the last word simply runs up to it again.
  const natural = naturalLineEnd(lines, index, duration);
  const joins = natural != null && Math.abs(time - natural) <= SAME;
  const end = joins ? null : time;
  if ((last.w.end ?? null) === end) return lines;
  return apply({ ...line, words: words.map((w, i) => (i === last.i ? { ...w, end } : w)) });
}
