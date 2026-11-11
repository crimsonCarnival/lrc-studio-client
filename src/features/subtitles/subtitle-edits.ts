import type { EditorLine } from '@/features/editor/editor.types';
import { MIN_EDIT_LENGTH } from './subtitle-cues';
import type { Cue } from './subtitles.types';
import type { TranslationSlot } from './subtitle-bundle';

/**
 * Splits text at the whitespace nearest the point `ratio` (0 to 1) of the way through it.
 * The second half is '' when there is no whitespace to split at.
 */
export function splitText(text: string, ratio: number): [string, string] {
  const trimmed = text.trim();
  const target = trimmed.length * ratio;
  let best = -1;
  for (const match of trimmed.matchAll(/\s+/g)) {
    const at = match.index;
    if (best === -1 || Math.abs(at - target) < Math.abs(best - target)) best = at;
  }
  if (best === -1) return [trimmed, ''];
  return [trimmed.slice(0, best).trim(), trimmed.slice(best).trim()];
}

// Per-word times belong to words that no longer sit where they did after a split or merge.
const WORD_KEYS = new Set(['words', 'secondaryWords']);
const withoutWordTimes = (line: EditorLine): EditorLine =>
  Object.fromEntries(Object.entries(line).filter(([key]) => !WORD_KEYS.has(key))) as EditorLine;

/** Text that the split would leave on the second line is what makes a split possible at all. */
export function canSplitCue(cue: Cue, text: string, at: number): boolean {
  if (at < cue.start + MIN_EDIT_LENGTH || at > cue.end - MIN_EDIT_LENGTH) return false;
  return splitText(text, (at - cue.start) / (cue.end - cue.start))[1] !== '';
}

/**
 * Splits a cue's line in two at time `at`, dividing its text at the nearest space. The
 * second line carries only the text, the new times and the singers: a translation or
 * secondary line cannot be divided meaningfully, so it stays with the first. Null when
 * the split is not possible (see `canSplitCue`).
 */
export function splitCueLine(
  lines: EditorLine[],
  cue: Cue,
  at: number,
  newId: () => string = () => crypto.randomUUID(),
): EditorLine[] | null {
  const line = lines[cue.lineIndex];
  if (!line || !canSplitCue(cue, line.text ?? '', at)) return null;
  const [first, second] = splitText(line.text ?? '', (at - cue.start) / (cue.end - cue.start));
  const head: EditorLine = { ...withoutWordTimes(line), text: first, timestamp: cue.start, endTime: at, source: 'manual' };
  const tail: EditorLine = {
    ...(line.singers && { singers: line.singers }),
    ...(line.mode && { mode: line.mode }),
    id: newId(),
    text: second,
    timestamp: at,
    endTime: cue.end,
    source: 'manual',
  };
  return [...lines.slice(0, cue.lineIndex), head, tail, ...lines.slice(cue.lineIndex + 1)];
}

/**
 * Joins a cue with the cue after it (in time order): one line spanning both. Null for the last
 * cue, and when the merge would lose something: the second line's secondary or translation text
 * has no place in one line, and a counterpart is a separate voice, not more lyric.
 */
export function mergeCueWithNext(lines: EditorLine[], cues: Cue[], index: number): EditorLine[] | null {
  const cue = cues[index];
  const next = cues[index + 1];
  const line = lines[cue?.lineIndex];
  const nextLine = lines[next?.lineIndex];
  if (!cue || !next || !line || !nextLine) return null;
  if (nextLine.secondary?.trim() || nextLine.translations?.some((t) => t.text?.trim())) return null;
  if ((line.adLibOf != null) !== (nextLine.adLibOf != null)) return null;
  const text = [line.text ?? '', nextLine.text ?? ''].map((s) => s.trim()).filter(Boolean).join(' ');
  const merged: EditorLine = { ...withoutWordTimes(line), text, timestamp: cue.start, endTime: Math.max(cue.end, next.end), source: 'manual' };
  return lines.flatMap((l, i) => (i === cue.lineIndex ? [merged] : i === next.lineIndex ? [] : [l]));
}

/** Index of the first lyric line (not a section marker) that has text but no time yet, or -1. */
export function firstUntimedLine(lines: EditorLine[]): number {
  return lines.findIndex((l) => l.type !== 'section' && l.timestamp == null && (l.text ?? '').trim() !== '');
}

export type MarkOptions = { duration?: number; minGap?: number };

const roundMs = (s: number) => Math.round(s * 1000) / 1000;

/**
 * First half of marking a line: it starts at `at` and has no end yet, so its end is inferred
 * until `markEnd` sets it.
 */
export function markStart(lines: EditorLine[], lineIndex: number, at: number): EditorLine[] {
  return lines.map((l, i) => (i === lineIndex ? { ...l, timestamp: roundMs(at), endTime: null, source: 'manual' as const } : l));
}

/**
 * Second half: the line ends at `at`, but never before it has run `MIN_EDIT_LENGTH`, and no
 * later than just before the next cue starts or the media ends. Null when the line has no start.
 */
export function markEnd(lines: EditorLine[], lineIndex: number, at: number, cues: Cue[], opts: MarkOptions = {}): EditorLine[] | null {
  const start = lines[lineIndex]?.timestamp;
  if (start == null) return null;
  const { duration, minGap = 0.05 } = opts;
  const nextStart = cues.find((c) => c.start > start && c.lineIndex !== lineIndex)?.start;
  let end = at;
  if (nextStart != null) end = Math.min(end, nextStart - minGap);
  if (duration) end = Math.min(end, duration);
  end = Math.max(end, start + MIN_EDIT_LENGTH);
  return lines.map((l, i) => (i === lineIndex ? { ...l, endTime: roundMs(end), source: 'manual' as const } : l));
}

/** Forgets a cue's end, so it is inferred again from the next cue. */
export function clearCueEnd(lines: EditorLine[], cue: Cue): EditorLine[] {
  return lines.map((l, i) => (i === cue.lineIndex ? { ...l, endTime: null } : l));
}

/** Forgets both times. The text stays, and the line goes back to waiting to be marked. */
export function clearCueTimes(lines: EditorLine[], cue: Cue): EditorLine[] {
  return lines.map((l, i) => (i === cue.lineIndex ? { ...l, timestamp: null, endTime: null, source: null } : l));
}

/** Removes a cue's line from the lyrics. */
export function removeCueLine(lines: EditorLine[], cue: Cue): EditorLine[] {
  return lines.filter((_, i) => i !== cue.lineIndex);
}

/**
 * Every translation slot the lines carry, even one nobody has typed in yet, named by the
 * language its lines give it (the first non-empty one), else "Translation N". Lines keep their
 * translations by position, so slot `index` is the same language on every line.
 */
export function studioLanguages(lines: EditorLine[]): TranslationSlot[] {
  const labels: string[] = [];
  let count = 0;
  for (const line of lines) {
    if (line.type === 'section') continue;
    line.translations?.forEach((tr, i) => {
      count = Math.max(count, i + 1);
      if (!labels[i] && tr.language?.trim()) labels[i] = tr.language.trim();
    });
  }
  return Array.from({ length: count }, (_, index) => ({ index, label: labels[index] || `Translation ${index + 1}` }));
}

/**
 * Adds a language as the next slot on every line, empty, so all lines stay aligned. A language
 * the lines already have (ignoring case) is left alone.
 */
export function addTranslationLanguage(lines: EditorLine[], label: string): EditorLine[] {
  const name = label.trim();
  const slots = studioLanguages(lines);
  if (!name || slots.some((s) => s.label.toLowerCase() === name.toLowerCase())) return lines;
  const index = slots.length;
  return lines.map((l) => {
    if (l.type === 'section') return l;
    const translations = [...(l.translations ?? [])];
    while (translations.length < index) translations.push({ text: '', language: '' });
    translations[index] = { text: '', language: name };
    return { ...l, translations };
  });
}

/** Drops a language from every line. The slots after it move up by one, on every line alike. */
export function removeTranslationLanguage(lines: EditorLine[], index: number): EditorLine[] {
  return lines.map((l) => (l.translations && index < l.translations.length ? { ...l, translations: l.translations.filter((_, i) => i !== index) } : l));
}

/** Sets one line's text in one language, padding the line's slots up to it if it has fewer. */
export function setLineTranslation(lines: EditorLine[], lineIndex: number, slot: number, text: string): EditorLine[] {
  return lines.map((l, i) => {
    if (i !== lineIndex) return l;
    const translations = [...(l.translations ?? [])];
    while (translations.length <= slot) translations.push({ text: '', language: '' });
    translations[slot] = { ...translations[slot], text };
    return { ...l, translations };
  });
}
