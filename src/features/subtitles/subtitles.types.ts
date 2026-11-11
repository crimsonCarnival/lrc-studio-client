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

export type BuildCuesOptions = {
  /** Media length in seconds, used to cap the last cue's inferred end. */
  duration?: number;
  includeSecondary?: boolean;
  includeTranslations?: boolean;
  translationIndex?: number;
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
