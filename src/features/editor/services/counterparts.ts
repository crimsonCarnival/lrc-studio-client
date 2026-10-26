/**
 * Counterparts: a second voice sung over a line, from a short "yeah" to a whole phrase that
 * keeps going under the next lines. A counterpart is a lyric line that carries `adLibOf`
 * (the timestamp of the line it sits over) next to its own `timestamp`, and it is stored
 * right after that line. It starts inside that line but may end after later lines begin.
 * Pure functions only.
 *
 * Capturing is two steps on purpose (redesign sheet 20): tap when you hear it, name it
 * later. A captured counterpart with no text yet is "pending".
 */
import type { EditorLine } from '@/features/editor/editor.types';

export const isCounterpart = (line: EditorLine | undefined): boolean =>
  !!line && line.type !== 'section' && line.adLibOf != null;

export const isPendingCounterpart = (line: EditorLine | undefined): boolean =>
  isCounterpart(line) && !line?.text?.trim();

/** When the counterpart is heard. Older ones have no time of their own and start with their line. */
export const counterpartTime = (line: EditorLine): number | null => line.timestamp ?? line.adLibOf ?? null;

const isMain = (line: EditorLine) => line.type !== 'section' && line.adLibOf == null;

type TimedLine = {
  timestamp?: number | null;
  endTime?: number | null;
  adLibOf?: number | null;
  words?: { time?: number | null }[];
};

/** A counterpart with text but no word times: it can only last until the next main line. */
export const counterpartNeedsWords = (line: TimedLine & { text?: string; type?: string }): boolean =>
  line.type !== 'section' && line.adLibOf != null && !!line.text?.trim() && !line.words?.some((w) => w.time != null);

/**
 * When a counterpart stops sounding. Its own end time wins; otherwise its last word plus
 * that word's estimated length (the average gap between its timed words, the same estimate
 * the preview fill uses), so a phrase can run on under the next lines. Never earlier than
 * the next main line, which is where a counterpart without word times has always ended.
 */
export function counterpartEnd(line: TimedLine, nextMainStart: number | null): number | null {
  if (line.endTime != null) return line.endTime;
  const start = line.timestamp ?? line.adLibOf ?? null;
  const fallback = nextMainStart ?? (start != null ? start + 5 : null);
  const times = (line.words ?? []).map((w) => w.time).filter((t): t is number => t != null);
  if (times.length === 0) return fallback;
  const last = times[times.length - 1];
  const wordsEnd = last + (times.length >= 2 ? (last - times[0]) / (times.length - 1) : 0.8);
  return fallback == null ? wordsEnd : Math.max(wordsEnd, fallback);
}

export interface CounterpartEntry {
  /** Index in the flat lines array. */
  index: number;
  line: EditorLine;
  time: number;
}

/** Every counterpart that has a time, in list order. */
export function listCounterparts(lines: EditorLine[]): CounterpartEntry[] {
  const out: CounterpartEntry[] = [];
  lines.forEach((line, index) => {
    if (!isCounterpart(line)) return;
    const time = counterpartTime(line);
    if (time != null) out.push({ index, line, time });
  });
  return out;
}

/**
 * Drops a pending counterpart at `time`. It belongs to the last synced line that started at or
 * before `time`, and goes after that line's earlier counterparts so the list stays in time order.
 * It takes the singers of the previous counterpart, since a second voice rarely changes mid-song.
 * Returns null when no line is synced yet at that point: there is nothing to sit over.
 */
export function captureCounterpart(lines: EditorLine[], time: number, id: string): { lines: EditorLine[]; index: number } | null {
  let parent = -1;
  for (let i = 0; i < lines.length; i++) {
    const ts = lines[i].timestamp;
    if (isMain(lines[i]) && ts != null && ts <= time) parent = i;
  }
  if (parent < 0) return null;

  let insertAt = parent + 1;
  while (insertAt < lines.length && isCounterpart(lines[insertAt]) && (counterpartTime(lines[insertAt]) ?? 0) <= time) insertAt++;

  let singers: string[] | undefined;
  for (let i = insertAt - 1; i >= 0 && !singers; i--) {
    if (isCounterpart(lines[i]) && lines[i].singers?.length) singers = [...lines[i].singers!];
  }

  const counterpart: EditorLine = { id, text: '', timestamp: time, adLibOf: lines[parent].timestamp, source: 'manual', mode: 'solo', singers };
  const next = [...lines];
  next.splice(insertAt, 0, counterpart);
  return { lines: next, index: insertAt };
}

/**
 * The span a counterpart may move in: from the start of its line to the start of the next
 * synced line. Past either end it would belong to another line.
 */
export function counterpartBounds(lines: EditorLine[], index: number): { min: number; max: number | null } {
  let min = lines[index]?.adLibOf ?? 0;
  for (let i = index - 1; i >= 0; i--) {
    if (isMain(lines[i])) { min = lines[i].timestamp ?? min; break; }
  }
  let max: number | null = null;
  for (let i = index + 1; i < lines.length && max == null; i++) {
    if (isMain(lines[i]) && lines[i].timestamp != null) max = lines[i].timestamp!;
  }
  return { min, max };
}

/** Moves a counterpart in time, kept inside its line. Other lines are untouched. */
export function moveCounterpart(lines: EditorLine[], index: number, time: number): EditorLine[] {
  if (!isCounterpart(lines[index])) return lines;
  const { min, max } = counterpartBounds(lines, index);
  const clamped = Math.max(min, max != null ? Math.min(time, max - 0.01) : time);
  if (clamped === lines[index].timestamp) return lines;
  const next = [...lines];
  next[index] = { ...lines[index], timestamp: Math.round(clamped * 1000) / 1000, source: 'manual' };
  return next;
}

/**
 * Texts to offer when naming a counterpart: the ones this song already uses, most used first,
 * topped up with common ones.
 */
export function frequentCounterparts(lines: EditorLine[], defaults: string[], limit = 6): string[] {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const text = isCounterpart(line) ? line.text?.trim() : '';
    if (text) counts.set(text, (counts.get(text) ?? 0) + 1);
  }
  const used = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([text]) => text);
  const lower = new Set(used.map((t) => t.toLowerCase()));
  return [...used, ...defaults.filter((d) => !lower.has(d.toLowerCase()))].slice(0, limit);
}

/**
 * The stretch of the song the capture strip shows: the line being sung and the one after
 * it, so there is room to see where a counterpart falls. At least four seconds wide.
 */
export function counterpartWindow(lines: EditorLine[], position: number): { start: number; end: number } {
  const starts = lines.filter((l) => isMain(l) && l.timestamp != null).map((l) => l.timestamp!).sort((a, b) => a - b);
  if (starts.length === 0) return { start: Math.max(0, position - 1), end: Math.max(0, position - 1) + 8 };
  let cur = 0;
  for (let i = 0; i < starts.length; i++) if (starts[i] <= position) cur = i;
  const start = Math.max(0, Math.min(starts[cur], position) - 0.5);
  const end = starts[cur + 2] ?? Math.max(starts[cur + 1] ?? 0, position, starts[cur]) + 6;
  return { start, end: Math.max(end, start + 4) };
}
