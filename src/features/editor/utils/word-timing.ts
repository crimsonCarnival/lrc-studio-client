import { hasKanji, splitOkurigana, toHiragana } from '@/shared/utils/furigana';
import type { EditorWord } from '@/features/editor/editor.types';

/** Smallest gap kept between two neighbouring word edges while dragging. */
export const MIN_WORD_GAP = 0.02;
/** A timed word shorter than this (seconds) is flagged: nobody sings a word in under 80 ms. */
export const TOO_SHORT = 0.08;

export interface WordSegment {
  word: string;
  timed: boolean;
  /** Where the word starts on the timeline (clamped to the line). */
  from: number;
  /** Where the word stops: its own end when it has one, else where the next word starts. */
  to: number;
  /** Where the next word starts, when the word stops earlier (a pause); else equal to `to`. */
  gapTo: number;
  /** The word has its own saved end (it does not simply run into the next word). */
  hasEnd: boolean;
}

/**
 * The line's words laid out in time. Timed words run to their own end or the next timed word;
 * words with no time yet share what is left of the line evenly.
 */
export function layoutWords(words: EditorWord[], start: number, end: number): WordSegment[] {
  // Clamped for drawing: a time outside the line (older data, or a line start moved after its
  // words were stamped) sits at the edge instead of spilling out of the track.
  const clamp = (t: number) => Math.min(end, Math.max(start, t));
  const times = words.map((w) => (w.time == null ? null : clamp(w.time)));
  let lastTimed = -1;
  times.forEach((time, i) => { if (time != null) lastTimed = i; });
  const untimedCount = words.length - 1 - lastTimed;
  const tailStart = lastTimed >= 0 ? (times[lastTimed] as number) : start;
  const tailShare = (end - tailStart) / (untimedCount + (lastTimed >= 0 ? 1 : 0) || 1);
  return words.map((w, i) => {
    const time = times[i];
    let from: number;
    let next: number;
    if (i <= lastTimed) {
      // An untimed word between timed ones has no width of its own.
      from = time ?? (times.slice(0, i).reverse().find((x) => x != null) ?? start);
      const nextTimed = times.slice(i + 1, lastTimed + 1).find((x) => x != null);
      next = time == null ? from : nextTimed ?? tailStart + tailShare;
    } else {
      const k = i - lastTimed - (lastTimed >= 0 ? 0 : 1);
      from = tailStart + tailShare * k;
      next = from + tailShare;
    }
    from = Math.max(start, from);
    next = Math.max(from, Math.min(next, end));
    const ownEnd = time != null && w.end != null && w.end > from && w.end < next ? clamp(w.end) : null;
    return { word: w.word ?? '', timed: time != null, from, to: ownEnd ?? next, gapTo: next, hasEnd: ownEnd != null };
  });
}

/**
 * Where a word's end is stored when its right edge is put at `raw`: a time, or null when the
 * edge is back against what follows (the word then simply runs up to it). `holdLimit` is given
 * for a line's last word when another line follows: the start of that line, which the word may
 * run on past (the two lines then overlap). `cap` is the end of the track.
 */
export function wordEndAt(seg: WordSegment, raw: number, holdLimit: number | null, cap: number): number | null {
  const limit = holdLimit ?? seg.gapTo;
  if (holdLimit != null && raw > limit + 0.005) return Number(Math.min(raw, cap).toFixed(3));
  if (raw >= limit - 0.005) return null;
  return Number(Math.max(seg.from + MIN_WORD_GAP, raw).toFixed(3));
}

const SMALL_KANA = /[ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ]/;

/** The kana a word is sung as: its reading around the okurigana, or the word itself when it is kana. */
export function wordKana(w: EditorWord): string | null {
  const text = w.word ?? '';
  if (w.reading && hasKanji(text)) {
    const { lead, tail } = splitOkurigana(text);
    return toHiragana(lead + w.reading + tail);
  }
  return /^[぀-ヿー]+$/.test(text) ? text : null;
}

/**
 * Splits kana into morae (the syllable beats a karaoke highlight moves by): a small kana joins
 * the one before it (きょ), while っ, ん and ー each take a beat of their own.
 */
export function splitMorae(kana: string): string[] {
  const out: string[] = [];
  for (const ch of kana) {
    if (SMALL_KANA.test(ch) && out.length) out[out.length - 1] += ch;
    else if (ch.trim()) out.push(ch);
  }
  return out;
}

export type SnapMode = 'off' | 'playhead' | 'edges' | 'grid';

/**
 * Pulls a dragged time onto something worth landing on: the playhead or another word's edge when
 * within `reach` seconds, or the 10 ms grid.
 */
export function snapTime(time: number, mode: SnapMode, reach: number, playhead: number, edges: number[]): number {
  if (mode === 'grid') return Math.round(time * 100) / 100;
  if (mode === 'playhead') return Math.abs(time - playhead) <= reach ? playhead : time;
  if (mode === 'edges') {
    let best = time;
    let bestD = reach;
    for (const e of edges) {
      const d = Math.abs(time - e);
      if (d <= bestD) { best = e; bestD = d; }
    }
    return best;
  }
  return time;
}
