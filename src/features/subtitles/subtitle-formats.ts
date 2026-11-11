import type { Cue, SubtitleFormat } from './subtitles.types';

export type SerializeOptions = {
  lineEndings?: 'lf' | 'crlf';
};

// Whole milliseconds, rounded: `Math.floor((s % 1) * 1000)` turns 1.005 into 1.004.
const toMs = (seconds: number): number => Math.max(0, Math.round(seconds * 1000));

function clock(ms: number, msSeparator: string, padHours: boolean): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const hh = padHours ? String(h).padStart(2, '0') : String(h);
  return `${hh}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${msSeparator}${String(ms % 1000).padStart(3, '0')}`;
}

/** WebVTT text: `&`, `<` and `>` are markup there, and escaping `>` also defuses a literal `-->`. */
const escapeVtt = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** SRT and SBV have no escapes; a literal `-->` would be read as a timing line. */
const defuseArrow = (s: string): string => s.replace(/-->/g, '->');

/** A cue whose end rounds to or before its start is clamped so the file stays parseable. */
function range(cue: Cue): { start: number; end: number } {
  const start = toMs(cue.start);
  return { start, end: Math.max(toMs(cue.end), start + 1) };
}

function srtBlock(cue: Cue, n: number): string {
  const { start, end } = range(cue);
  return `${n}\n${clock(start, ',', true)} --> ${clock(end, ',', true)}\n${defuseArrow(cue.text)}`;
}

function vttBlock(cue: Cue): string {
  const { start, end } = range(cue);
  return `${clock(start, '.', true)} --> ${clock(end, '.', true)}\n${escapeVtt(cue.text)}`;
}

function sbvBlock(cue: Cue): string {
  const { start, end } = range(cue);
  return `${clock(start, '.', false)},${clock(end, '.', false)}\n${defuseArrow(cue.text)}`;
}

/**
 * Writes cues as an SRT, WebVTT or SBV file, the three formats YouTube Studio takes with
 * timing. Output is UTF-8 text without a BOM. Returns '' when there are no cues.
 */
export function serializeCues(cues: Cue[], format: SubtitleFormat, opts: SerializeOptions = {}): string {
  if (cues.length === 0) return '';
  let out: string;
  if (format === 'vtt') out = `WEBVTT\n\n${cues.map(vttBlock).join('\n\n')}\n`;
  else if (format === 'sbv') out = `${cues.map(sbvBlock).join('\n\n')}\n`;
  else out = `${cues.map((c, i) => srtBlock(c, i + 1)).join('\n\n')}\n`;
  return opts.lineEndings === 'crlf' ? out.replace(/\n/g, '\r\n') : out;
}
