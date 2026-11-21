import type { Cue, KaraokePiece, SubtitleFormat } from './subtitles.types';

export type SerializeOptions = {
  lineEndings?: 'lf' | 'crlf';
  /** BCP 47 code for TTML's `xml:lang`; left empty (undetermined) when unknown. */
  language?: string;
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

/**
 * The cue's word pieces and the untimed rest of its text, or null when it has no usable word
 * timing (none, or a piece text that no longer opens the cue text).
 */
function splitKaraoke(cue: Cue): { pieces: KaraokePiece[]; rest: string } | null {
  if (!cue.karaoke?.length) return null;
  const head = cue.karaoke.map((p) => p.text).join('');
  return cue.text.startsWith(head) ? { pieces: cue.karaoke, rest: cue.text.slice(head.length) } : null;
}

/**
 * WebVTT inline timestamps (`<00:00:01.250>`) before each word. The spec only allows them inside the
 * cue and rising, so a word at or before the previous mark (or at the cue's start) gets none and
 * reads as part of the word before. VTT has no way to say a word stops early: ends are dropped.
 */
function vttText(cue: Cue, startMs: number, endMs: number): string {
  const split = splitKaraoke(cue);
  if (!split) return escapeVtt(cue.text);
  let last = startMs;
  let out = '';
  for (const piece of split.pieces) {
    const at = toMs(piece.time);
    if (at > last && at < endMs) {
      out += `<${clock(at, '.', true)}>`;
      last = at;
    }
    out += escapeVtt(piece.text);
  }
  return out + escapeVtt(split.rest);
}

function vttBlock(cue: Cue): string {
  const { start, end } = range(cue);
  return `${clock(start, '.', true)} --> ${clock(end, '.', true)}\n${vttText(cue, start, end)}`;
}

function sbvBlock(cue: Cue): string {
  const { start, end } = range(cue);
  return `${clock(start, '.', false)},${clock(end, '.', false)}\n${defuseArrow(cue.text)}`;
}

/** ASS clock: `H:MM:SS.cc`, centiseconds. */
function assClock(ms: number): string {
  const cs = Math.round(ms / 10);
  const h = Math.floor(cs / 360_000);
  const m = Math.floor((cs % 360_000) / 6000);
  const sec = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
}

/**
 * ASS has no escapes: `{…}` is an override block and a backslash starts a tag (`\N`, `\h`), so a
 * literal brace becomes a parenthesis and a backslash its look-alike (\u29F5). Line breaks are `\N`.
 */
const escapeAss = (s: string): string =>
  s.replace(/\\/g, '\u29F5').replace(/\{/g, '(').replace(/\}/g, ')').replace(/\r?\n/g, '\\N');

// One plain style, bottom-centred with an outline: enough to read over video, and the first thing
// anyone restyles in Aegisub. Colours are ASS &HAABBGGRR values, not CSS. Karaoke words wait in the
// secondary colour (grey) and fill to the primary one (white) as they are sung.
const ASS_HEADER = [
  '[Script Info]',
  '; Written by LRC Studio',
  'ScriptType: v4.00+',
  'PlayResX: 1920',
  'PlayResY: 1080',
  'WrapStyle: 0',
  'ScaledBorderAndShadow: yes',
  '',
  '[V4+ Styles]',
  'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
  'Style: Default,Arial,64,&H00FFFFFF,&H00A0A0A0,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,3,1,2,60,60,50,1',
  '',
  '[Events]',
  'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
].join('\n');

/**
 * ASS karaoke: `{\kf<cs>}` before each word, its length in centiseconds, so the word fills from the
 * style's secondary colour to its primary one as it is sung. A pause (before the first word, or
 * after a word that stops early) is an empty `{\k<cs>}`. Lengths are differences of times rounded
 * once, from the event's own start, so rounding never drifts along the line.
 */
function assText(cue: Cue, startMs: number, endMs: number): string {
  const split = splitKaraoke(cue);
  if (!split) return escapeAss(cue.text);
  const startCs = Math.round(startMs / 10);
  const endCs = Math.round(endMs / 10);
  const cs = (seconds: number) => Math.min(Math.max(Math.round(seconds * 100), startCs), endCs);
  let cursor = startCs;
  let out = '';
  split.pieces.forEach((piece, i) => {
    const at = Math.max(cs(piece.time), cursor);
    if (at > cursor) out += `{\\k${at - cursor}}`;
    const next = i + 1 < split.pieces.length ? Math.max(cs(split.pieces[i + 1].time), at) : endCs;
    const stop = piece.end != null ? Math.min(Math.max(cs(piece.end), at), next) : next;
    out += `{\\kf${stop - at}}${escapeAss(piece.text)}`;
    cursor = stop;
  });
  // A last word that stops before the event ends: the closing pause records where.
  if (cursor < endCs && split.pieces[split.pieces.length - 1].end != null) out += `{\\k${endCs - cursor}}`;
  return out + escapeAss(split.rest);
}

function assLine(cue: Cue): string {
  const { start, end } = range(cue);
  // ASS counts centiseconds: an end within 10 ms of the start would round onto it, an empty event.
  const endMs = Math.max(end, start + 10);
  // A counterpart goes on the layer above its main line, so a renderer stacks it instead of replacing.
  return `Dialogue: ${cue.counterpart ? 1 : 0},${assClock(start)},${assClock(endMs)},Default,,0,0,0,,${assText(cue, start, endMs)}`;
}

const escapeXml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function ttmlParagraph(cue: Cue): string {
  const { start, end } = range(cue);
  const text = cue.text.split(/\r?\n/).map(escapeXml).join('<br/>');
  return `      <p begin="${clock(start, '.', true)}" end="${clock(end, '.', true)}">${text}</p>`;
}

function ttmlDocument(cues: Cue[], language = ''): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<tt xmlns="http://www.w3.org/ns/ttml" xml:lang="${escapeXml(language)}">`,
    '  <body>',
    '    <div>',
    ...cues.map(ttmlParagraph),
    '    </div>',
    '  </body>',
    '</tt>',
    '',
  ].join('\n');
}

/**
 * Writes cues as an SRT, WebVTT or SBV file (the three YouTube Studio takes with timing), an ASS
 * script or a TTML (DFXP) document. Output is UTF-8 text without a BOM. Returns '' when there
 * are no cues.
 */
export function serializeCues(cues: Cue[], format: SubtitleFormat, opts: SerializeOptions = {}): string {
  if (cues.length === 0) return '';
  let out: string;
  if (format === 'vtt') out = `WEBVTT\n\n${cues.map(vttBlock).join('\n\n')}\n`;
  else if (format === 'sbv') out = `${cues.map(sbvBlock).join('\n\n')}\n`;
  else if (format === 'ass') out = `${ASS_HEADER}\n${cues.map(assLine).join('\n')}\n`;
  else if (format === 'ttml') out = ttmlDocument(cues, opts.language);
  else out = `${cues.map((c, i) => srtBlock(c, i + 1)).join('\n\n')}\n`;
  return opts.lineEndings === 'crlf' ? out.replace(/\n/g, '\r\n') : out;
}
