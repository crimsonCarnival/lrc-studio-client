/**
 * Reads the subtitle formats the editor imports besides SRT: WebVTT, YouTube's SBV and
 * (Advanced) SubStation Alpha. Each cue becomes a timed line with an end time, the same shape
 * the SRT branch of `parseLrcSrtFile` produces. Styling and positioning are dropped. Word timing
 * is kept where the format has it (WebVTT inline timestamps, ASS karaoke tags) as the line's
 * `words`, the shape enhanced-LRC import gives them.
 *
 * Mirror of server/src/utils/subtitle-parse.ts, used by the offline parse fallback; keep
 * the two in step.
 */

export type SubtitleImportFormat = 'vtt' | 'sbv' | 'ass';

export type ParsedWord = { word: string; time: number | null; end?: number };

export type ParsedCue = { start: number; end: number; text: string; words?: ParsedWord[] };

/** A run of cue text and when it starts being sung (null: it runs on from the run before). */
type Segment = { text: string; time: number | null };

// The ranges enhanced-LRC import splits per character (CJK_CHAR_RE in lrc.ts): CJK is written
// without spaces, so each character is a word of its own.
const isCjk = (ch: string): boolean => {
  const c = ch.codePointAt(0) ?? 0;
  return (c >= 0x3000 && c <= 0x9fff) || (c >= 0xf900 && c <= 0xfaff);
};

/** The cue text the runs spell: each row trimmed, empty rows dropped. */
function joinRows(segments: Segment[]): string {
  return segments.map((s) => s.text).join('').split('\n').map((r) => r.trim()).filter(Boolean).join('\n');
}

/**
 * Words from timed runs, split as the editor stores them: at whitespace, and around each CJK
 * character. A word takes the time of the run it starts at. One that starts inside a run
 * (`<t>Hello there`) gets no time, and a syllable marked inside a word (`{\k20}to{\k30}day`)
 * adds none: the editor times whole words. A run with no text marks where the word before stops.
 */
function wordsFromSegments(segments: Segment[]): ParsedWord[] {
  const words: ParsedWord[] = [];
  let inWord = false;
  for (const seg of segments) {
    const last = words[words.length - 1];
    if (!seg.text.trim()) {
      if (seg.time != null && last?.time != null && seg.time > last.time) last.end = seg.time;
      if (seg.text) inWord = false;
      continue;
    }
    let pending = seg.time;
    for (const ch of seg.text) {
      if (/\s/.test(ch)) { inWord = false; continue; }
      if (inWord && !isCjk(ch)) {
        const word = words[words.length - 1];
        word.word += ch;
        // The word goes on, so a stop marked before this syllable was not its end.
        delete word.end;
      } else {
        words.push({ word: ch, time: pending });
        inWord = !isCjk(ch);
      }
      pending = null;
    }
  }
  return words;
}

function cueFrom(start: number, end: number, run: { segments: Segment[]; timed: boolean }): ParsedCue | null {
  const text = joinRows(run.segments);
  if (!text) return null;
  return run.timed ? { start, end, text, words: wordsFromSegments(run.segments) } : { start, end, text };
}

const EXTENSIONS: Record<string, SubtitleImportFormat> = { vtt: 'vtt', sbv: 'sbv', ass: 'ass', ssa: 'ass' };

/** The subtitle format a file name names, or null for anything else (lrc, srt, txt…). */
export function subtitleImportFormat(filename: string): SubtitleImportFormat | null {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  return EXTENSIONS[ext] ?? null;
}

/** `[H:]MM:SS(.|,)fff` → seconds; the fraction may have 1–3 digits (ASS uses 2). */
function toSeconds(clock: string): number | null {
  const m = clock.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/);
  if (!m) return null;
  const frac = m[4] ? parseInt(m[4].padEnd(3, '0'), 10) / 1000 : 0;
  return parseInt(m[1] ?? '0', 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10) + frac;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', lrm: '\u200E', rlm: '\u200F' };

function decodeEntities(raw: string): string {
  return raw.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}

/**
 * WebVTT cue text: tags (`<i>`, `<c.x>`, `<v Name>`) are dropped and entities decoded; an inline
 * timestamp (`<00:01.000>`) starts a timed run. Text before the first one starts with the cue.
 */
function vttRuns(raw: string, start: number): { segments: Segment[]; timed: boolean } {
  const segments: Segment[] = [{ text: '', time: start }];
  let timed = false;
  // `[^<>]`, not `[^>]`: a match attempt then stops at the next `<`, so a run of unclosed `<`
  // costs linear time instead of each one scanning to the end of the line (this route is public).
  // The capture puts each tag at an odd index.
  raw.split(/(<[^<>]*>)/).forEach((part, i) => {
    if (i % 2 === 0) { segments[segments.length - 1].text += decodeEntities(part); return; }
    const time = /^<[\d:.]+>$/.test(part) ? toSeconds(part.slice(1, -1)) : null;
    if (time != null) { segments.push({ text: '', time }); timed = true; }
  });
  return { segments, timed };
}

function parseVtt(content: string): ParsedCue[] {
  const cues: ParsedCue[] = [];
  for (const block of content.split(/\n{2,}/)) {
    const rows = block.split('\n');
    const timingAt = rows.findIndex((r) => r.includes('-->'));
    // Header, NOTE, STYLE and REGION blocks have no timing line.
    if (timingAt === -1) continue;
    const [from, rest] = rows[timingAt].split('-->');
    const start = toSeconds(from);
    // Cue settings (`align:start line:90%`) follow the end time.
    const end = toSeconds(rest.trim().split(/\s+/)[0] ?? '');
    if (start == null || end == null) continue;
    const cue = cueFrom(start, end, vttRuns(rows.slice(timingAt + 1).join('\n'), start));
    if (cue) cues.push(cue);
  }
  return cues;
}

function parseSbv(content: string): ParsedCue[] {
  const cues: ParsedCue[] = [];
  for (const block of content.split(/\n{2,}/)) {
    const rows = block.split('\n');
    const m = rows[0]?.match(/^\s*([\d:.]+)\s*,\s*([\d:.]+)\s*$/);
    if (!m) continue;
    const start = toSeconds(m[1]);
    const end = toSeconds(m[2]);
    const text = rows.slice(1).map((r) => r.trim()).filter(Boolean).join('\n');
    if (start != null && end != null && text) cues.push({ start, end, text });
  }
  return cues;
}

/**
 * ASS event text: `{…}` override blocks are dropped, except karaoke lengths (`\k`, `\kf`, `\ko`,
 * `\K`, in centiseconds), each of which starts a timed run; `\N`/`\n` are line breaks, `\h` a hard
 * space. Times add up in whole centiseconds so a long line does not drift.
 */
function assRuns(raw: string, start: number): { segments: Segment[]; timed: boolean } {
  const segments: Segment[] = [{ text: '', time: start }];
  let cursor = Math.round(start * 100);
  let timed = false;
  // `[^{}]` keeps unclosed `{` runs linear, as in vttRuns.
  raw.split(/(\{[^{}]*\})/).forEach((part, i) => {
    if (i % 2 === 0) {
      segments[segments.length - 1].text += part.replace(/\\[Nn]/g, '\n').replace(/\\h/g, ' ');
      return;
    }
    for (const m of part.matchAll(/\\(?:k[fo]?|K)(\d+)/g)) {
      segments.push({ text: '', time: cursor / 100 });
      cursor += parseInt(m[1], 10);
      timed = true;
    }
  });
  return { segments, timed };
}

function parseAss(content: string): ParsedCue[] {
  const cues: ParsedCue[] = [];
  let inEvents = false;
  // Field order comes from the section's `Format:` line; these are the v4+ defaults. Positions are
  // looked up once per Format line, not per event, and a Format line with more fields than any real
  // script (v4+ has 10) is ignored, so per-event work stays bounded by the event's own length.
  const DEFAULT_FIELDS = ['layer', 'start', 'end', 'style', 'name', 'marginl', 'marginr', 'marginv', 'effect', 'text'];
  const MAX_FIELDS = 32;
  const layout = (fields: string[]) => ({ count: fields.length, start: fields.indexOf('start'), end: fields.indexOf('end'), text: fields.indexOf('text') });
  let at = layout(DEFAULT_FIELDS);
  for (const row of content.split('\n')) {
    const line = row.trim();
    if (line.startsWith('[')) { inEvents = line.toLowerCase() === '[events]'; continue; }
    if (!inEvents) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const kind = line.slice(0, colon).trim().toLowerCase();
    const body = line.slice(colon + 1);
    if (kind === 'format') {
      const fields = body.split(',', MAX_FIELDS + 1).map((f) => f.trim().toLowerCase());
      if (fields.length <= MAX_FIELDS) at = layout(fields);
      continue;
    }
    if (kind !== 'dialogue') continue; // Comment: lines are not shown
    if (at.start < 0 || at.end < 0 || at.text < 0) continue;
    // Text is the last field and may itself contain commas: split off the fields before it only.
    const parts = body.split(',', at.count - 1);
    const head = parts.reduce((n, p) => n + p.length + 1, 0);
    const values = [...parts, body.slice(head)];
    const start = toSeconds(values[at.start] ?? '');
    const end = toSeconds(values[at.end] ?? '');
    if (start == null || end == null) continue;
    const cue = cueFrom(start, end, assRuns(values[at.text] ?? '', start));
    if (cue) cues.push(cue);
  }
  // Events are stored in any order; the editor's lines run in time order.
  return cues.sort((a, b) => a.start - b.start);
}

export function parseSubtitleCues(content: string, format: SubtitleImportFormat): ParsedCue[] {
  const text = content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (format === 'vtt') return parseVtt(text);
  if (format === 'sbv') return parseSbv(text);
  return parseAss(text);
}
