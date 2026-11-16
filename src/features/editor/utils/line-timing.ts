import type { EditorLine, EditorWord } from '@/features/editor/editor.types';
import { alignLineStart } from '@/features/editor/services/editor.service';
import { lineSpanEnd, naturalLineEnd, nextTimedIndex, prevTimedIndex, tailWordEnd } from './line-span';

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

/** The line with its end put at `end`: its last timed word's end, or an end time when no word is timed. Null if that cannot be. */
function withEnd(line: EditorLine, end: number): EditorLine | null {
  const words = line.words ?? [];
  let last = -1;
  words.forEach((w, i) => { if (w.time != null) last = i; });
  if (last < 0) return { ...line, endTime: round(end) };
  if (end <= (words[last].time as number) + GAP) return null;
  return { ...line, words: words.map((w, i) => (i === last ? { ...w, end: round(end) } : w)) };
}

/**
 * Before a line's start moves: gives the line before it an end of its own, where it stops now,
 * so that moving this start does not take the end of that line along. A line without an end of
 * its own runs up to the next line, which is why its end follows that line's start; once it has
 * one, the two are independent. A line that already has an end, a counterpart, or a line that
 * has no time yet (being marked for the first time) is left as it is.
 */
export function pinPreviousEnd(lines: EditorLine[], index: number): EditorLine[] {
  const line = lines[index];
  if (!line || line.type === 'section' || line.timestamp == null || line.adLibOf != null) return lines;
  const p = prevTimedIndex(lines, index);
  if (p < 0) return lines;
  const prev = lines[p];
  if (prev.adLibOf != null || prev.endTime != null || tailWordEnd(prev) != null) return lines;
  const pinned = withEnd(prev, line.timestamp);
  if (!pinned) return lines;
  const out = [...lines];
  out[p] = pinned;
  return out;
}

/**
 * Applies one timing edit to one line, and nothing else but what keeps the lines around it where
 * they were: when this line's start moves, the line before it keeps its end (see pinPreviousEnd).
 * Another line's start is never touched. A line cannot start before the line before it has, nor after the line after it
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
  // The line before keeps its end when this line's start moves.
  const apply = (next: EditorLine, keepPreviousEnd = false): EditorLine[] => {
    const out = [...(keepPreviousEnd ? pinPreviousEnd(lines, index) : lines)];
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
    return apply(alignLineStart(moved, time), true);
  }

  if (edit.kind === 'move') {
    const start = round(clamp(edit.start, floor, ceil));
    const delta = round(start - line.timestamp);
    if (delta === 0) return lines;
    const moved: EditorLine = {
      ...line,
      source: 'manual',
      timestamp: start,
      ...(line.endTime != null ? { endTime: round(line.endTime + delta) } : {}),
      ...(line.words ? { words: shiftWords(line.words, delta) } : {}),
      ...(line.secondaryWords ? { secondaryWords: shiftWords(line.secondaryWords, delta) } : {}),
    };
    // A line that ran up to the next one keeps its length: its end moves with it instead of
    // staying on the next line's start.
    const ownEnd = line.endTime == null && tailWordEnd(line) == null && nextIndex >= 0 ? lineSpanEnd(lines, index, duration) : null;
    return apply((ownEnd != null ? withEnd(moved, ownEnd + delta) : null) ?? moved, true);
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
