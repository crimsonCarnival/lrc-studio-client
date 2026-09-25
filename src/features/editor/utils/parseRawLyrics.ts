import { getDefaultDepthForLabel } from '../constants/sectionTypes';
import { normalizeLineMode } from '../services/editor.service';
import type { EditorLine } from '../services/editor.service';
import { parseRawTextLine } from './sections';

// Matches an LRC timestamp: [mm:ss.xx] or [mm:ss.xxx]
const LRC_TIMESTAMP_RE = /^\[(\d{1,2}:\d{2}(?:[.:]\d{2,3})?)\](.*)$/;

/**
 * Parse a raw plain-text lyrics string (setup textarea) into editor lines, recognising:
 *  - LRC timestamps:  [00:12.34] lyric text
 *  - The raw-text syntax shared with the editor's Raw Lyrics modal (see utils/sections.ts):
 *    section headers `[Verse]`, `[Chorus | A, B]`, `[Bridge: A & B]`, `[]`, per-line
 *    singers `Name: lyric` (roster names only) and `\` escapes.
 *
 * Handles non-English section names (e.g. Puente, Estribillo) — they get depth 1
 * (unknown label) unless indented, and any singers specified after the colon.
 *
 * @param roster project singer roster (setup "Singers" field) for `Name:` line prefixes.
 */
export function parseRawLyricsText(text: string, roster: readonly string[] = []): EditorLine[] {
  const lines = text.split('\n');
  const result: EditorLine[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();

    // ── LRC timestamp line ──────────────────────────────────────────────────
    const lrcMatch = line.match(LRC_TIMESTAMP_RE);
    if (lrcMatch) {
      const [, ts, content] = lrcMatch;
      const [minStr, rest] = ts.split(':');
      const mins = parseInt(minStr, 10);
      const secs = parseFloat(rest.replace(':', '.'));
      const timestamp = mins * 60 + secs;
      result.push({
        text: content.trimStart(),
        timestamp,
        endTime: null,
        secondary: '',
        translation: '',
        id: crypto.randomUUID(),
      });
      continue;
    }

    const item = parseRawTextLine(line, roster);

    // ── Section header ──────────────────────────────────────────────────────
    if (item.kind === 'section') {
      result.push({
        type: 'section',
        label: item.label,
        // Fresh text has no serializer-written indentation, so a flush header takes the
        // label's natural depth ([Part] = root); an indented one is explicitly regular.
        depth: item.depth > 0 ? 1 : getDefaultDepthForLabel(item.label),
        singers: item.singers.length ? item.singers : undefined,
        timestamp: null,
        text: '',
        id: crypto.randomUUID(),
      });
      continue;
    }

    // ── Regular lyric line ──────────────────────────────────────────────────
    const lyric: EditorLine = {
      text: item.text,
      timestamp: null,
      endTime: null,
      secondary: '',
      translation: '',
      id: crypto.randomUUID(),
    };
    if (item.singers) {
      lyric.singers = item.singers;
      lyric.mode = normalizeLineMode(lyric);
    }
    result.push(lyric);
  }

  return result;
}
