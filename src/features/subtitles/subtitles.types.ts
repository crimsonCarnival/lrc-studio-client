export type SubtitleFormat = 'srt' | 'vtt' | 'sbv';

/** One displayed caption. Times are seconds; `lineIndex` points back into the editor's flat lines. */
export type Cue = {
  start: number;
  end: number;
  text: string;
  lineIndex: number;
  /** A counterpart sits over a main line, so edits treat the two kinds as separate. */
  counterpart?: boolean;
};

/**
 * One row of the studio's list, in the order of the lyrics. A line with a time is a `cue` (its
 * index into the time-ordered cues), one still waiting for a time is `untimed`, and a section
 * marker is a heading. Nothing that is a line is left out, so the list shows what is left to sync.
 */
export type StudioRow =
  | { kind: 'cue'; lineIndex: number; cueIndex: number }
  | { kind: 'untimed'; lineIndex: number }
  | { kind: 'section'; lineIndex: number; label: string };

export type BuildCuesOptions = {
  /** Media length in seconds, used to cap the last cue's inferred end. */
  duration?: number;
  includeSecondary?: boolean;
  includeTranslations?: boolean;
  translationIndex?: number;
  /**
   * Write one translation on its own: the cue text is that translation slot and nothing else
   * (no original text, no secondary), while timing still comes from the lines. A line with no
   * text in the slot has no cue. Overrides the two options above.
   */
  onlyTranslationIndex?: number;
  /** Gap left before the next cue when an end time has to be inferred. */
  minGap?: number;
  /** Length of an inferred end when there is no next cue. */
  defaultDuration?: number;
};

/**
 * Readability limits a cue is checked against. YouTube enforces none of these when it
 * ingests a file, so they are guidance, not YouTube's own numbers: they are the commonly
 * used caption-style defaults and callers may override them.
 */
export type CueRules = {
  minDuration: number;
  maxDuration: number;
  maxLines: number;
  maxLineChars: number;
};

export type CueIssueCode =
  | 'invalid_range'
  | 'starts_after_video'
  | 'overlap'
  | 'too_short'
  | 'too_long'
  | 'too_many_lines'
  | 'line_too_long';

export type CueIssue = {
  /** Index into the cue array, not into the editor's lines. */
  cue: number;
  code: CueIssueCode;
  /** `error`: the file would be wrong or the cue never shown. `warning`: legal but poor. */
  severity: 'error' | 'warning';
};
