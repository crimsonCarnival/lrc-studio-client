import { buildSecondaryText } from '@/shared/utils/lrc';
import type { EditorLine } from '@/features/editor/editor.types';
import type { BuildCuesOptions, Cue, CueIssue, CueRules, StudioRow } from './subtitles.types';

/** Defaults for caption readability. Not limits YouTube enforces; see `CueRules`. */
export const YOUTUBE_RULES: CueRules = {
  minDuration: 0.5,
  maxDuration: 7,
  maxLines: 2,
  maxLineChars: 42,
};

/** The number a readability warning quotes, so message text never drifts from the rule. */
export const ISSUE_LIMITS: Partial<Record<CueIssue['code'], number>> = {
  too_short: YOUTUBE_RULES.minDuration,
  too_long: YOUTUBE_RULES.maxDuration,
  too_many_lines: YOUTUBE_RULES.maxLines,
  line_too_long: YOUTUBE_RULES.maxLineChars,
};

// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * A blank line ends a cue in SRT, SBV and WebVTT, so text must never contain one. Also
 * drops control characters and trims each line.
 */
function cleanCueText(raw: string): string {
  return raw
    .replace(CONTROL_CHARS, '')
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * Turns the editor's lines into display-ordered cues: section markers and untimed lines
 * are dropped, a missing end is inferred from the next main line, and cues whose text
 * ends up empty are dropped (an empty cue is invalid in every subtitle format).
 */
export function buildCues(lines: EditorLine[], opts: BuildCuesOptions = {}): Cue[] {
  const minGap = opts.minGap || 0.05;
  const defaultDuration = opts.defaultDuration || 5;
  const translationIndex = opts.translationIndex ?? 0;

  const timed: { line: EditorLine; lineIndex: number }[] = [];
  lines.forEach((line, lineIndex) => {
    if (line.type !== 'section' && line.timestamp != null) timed.push({ line, lineIndex });
  });

  const cues: Cue[] = [];
  timed.forEach(({ line, lineIndex }, k) => {
    const start = line.timestamp as number;

    let end: number;
    if (line.endTime != null) {
      end = line.endTime;
    } else {
      // A counterpart sits on top of its main line, so it must not set that line's end.
      const next = timed.slice(k + 1).find((t) => t.line.adLibOf == null);
      if (next) end = Math.max(start + minGap, (next.line.timestamp as number) - minGap);
      else if (opts.duration) end = Math.min(start + defaultDuration, opts.duration);
      else end = start + defaultDuration;
    }

    // A cue cannot outlast the media: cap it rather than warn, the extra time is never seen.
    // One that starts after the media ends cannot be capped; the validator reports it.
    if (opts.duration && start < opts.duration) end = Math.min(end, opts.duration);

    const parts = opts.onlyTranslationIndex != null ? [line.translations?.[opts.onlyTranslationIndex]?.text ?? ''] : [line.text ?? ''];
    if (opts.onlyTranslationIndex == null && opts.includeSecondary) {
      const secondary = buildSecondaryText(line);
      if (secondary) parts.push(secondary);
    }
    if (opts.onlyTranslationIndex == null && opts.includeTranslations) {
      const translation = line.translations?.[translationIndex]?.text;
      if (translation) parts.push(translation);
    }

    const text = cleanCueText(parts.join('\n'));
    if (text) cues.push({ start, end, text, lineIndex, counterpart: line.adLibOf != null });
  });

  // Array.prototype.sort is stable, so cues starting together keep their line order.
  return cues.sort((a, b) => a.start - b.start);
}

/**
 * The studio's list rows in lyrics order: every cue, every line still without a time (text or
 * not, so a new empty line can be typed into), and the section markers. A timed line whose
 * text is empty has no cue and no row: there is nothing to show or edit.
 */
export function buildRows(lines: EditorLine[], cues: Cue[]): StudioRow[] {
  const cueIndexByLine = new Map(cues.map((c, i) => [c.lineIndex, i]));
  const rows: StudioRow[] = [];
  lines.forEach((line, lineIndex) => {
    if (line.type === 'section') {
      rows.push({ kind: 'section', lineIndex, label: line.label ?? '' });
      return;
    }
    const cueIndex = cueIndexByLine.get(lineIndex);
    if (cueIndex != null) rows.push({ kind: 'cue', lineIndex, cueIndex });
    else if (line.timestamp == null) rows.push({ kind: 'untimed', lineIndex });
  });
  return rows;
}

/** Every cue showing at `time`. Overlapping cues (a counterpart over its main line) are all shown. */
export function activeCues(cues: Cue[], time: number): Cue[] {
  return cues.filter((c) => time >= c.start && time < c.end);
}

/** The shortest a cue may be made by dragging; the readability rule in `CueRules` is separate. */
export const MIN_EDIT_LENGTH = 0.1;

const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), Math.max(lo, hi));

/**
 * The cue times to apply for an edit, kept legal: inside the media, no shorter than
 * `MIN_EDIT_LENGTH`, and never into a neighbouring cue. Pass `start` or `end` to drag one
 * edge, or both to move the cue, which keeps its length and stops against a neighbour.
 *
 * Policy: the nearest neighbour of the same kind is a wall. Dragging into one stops there
 * rather than pushing it along or overlapping it, so one edit never silently retimes a second
 * cue. Counterparts are skipped by main cues and vice versa: a counterpart is meant to overlap
 * its line, so treating it as a wall would pin the line to the counterpart's start.
 */
export function constrainCueEdit(
  cues: Cue[],
  index: number,
  edit: { start?: number; end?: number },
  duration?: number,
): { start: number; end: number } {
  const cue = cues[index];
  const sameKind = (c: Cue) => !!c.counterpart === !!cue.counterpart;
  let lower = 0;
  for (let i = index - 1; i >= 0; i--) {
    if (sameKind(cues[i])) { lower = cues[i].end; break; }
  }
  let upper = duration || Infinity;
  for (let i = index + 1; i < cues.length; i++) {
    if (sameKind(cues[i])) { upper = cues[i].start; break; }
  }

  if (edit.start != null && edit.end != null) {
    const length = edit.end - edit.start;
    const start = clamp(edit.start, lower, upper - length);
    return { start, end: start + length };
  }
  if (edit.start != null) return { start: clamp(edit.start, lower, cue.end - MIN_EDIT_LENGTH), end: cue.end };
  return { start: cue.start, end: clamp(edit.end ?? cue.end, cue.start + MIN_EDIT_LENGTH, upper) };
}

const codePoints = (s: string) => [...s].length;

/**
 * Checks cues (already in start order, as `buildCues` returns them) against `rules`.
 * Errors mean the file or the cue is broken; warnings mean it is legal but hard to read.
 */
export function validateCues(cues: Cue[], rules: CueRules = YOUTUBE_RULES, duration?: number): CueIssue[] {
  const issues: CueIssue[] = [];
  let latestEnd = -Infinity;

  cues.forEach((cue, i) => {
    const push = (code: CueIssue['code'], severity: CueIssue['severity']) => issues.push({ cue: i, code, severity });
    const length = cue.end - cue.start;

    // Compare in whole milliseconds: that is the precision the files are written in.
    if (Math.round(cue.end * 1000) <= Math.round(cue.start * 1000)) push('invalid_range', 'error');
    else {
      if (length < rules.minDuration) push('too_short', 'warning');
      if (length > rules.maxDuration) push('too_long', 'warning');
    }

    if (duration && cue.start >= duration) push('starts_after_video', 'error');

    if (cue.start < latestEnd) push('overlap', 'warning');
    latestEnd = Math.max(latestEnd, cue.end);

    const textLines = cue.text.split('\n');
    if (textLines.length > rules.maxLines) push('too_many_lines', 'warning');
    if (textLines.some((l) => codePoints(l) > rules.maxLineChars)) push('line_too_long', 'warning');
  });

  return issues;
}
