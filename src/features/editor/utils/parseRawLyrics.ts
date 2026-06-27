import { getDefaultDepthForLabel, isStructuralSection } from '../constants/sectionTypes';

// Matches an LRC timestamp: [mm:ss.xx] or [mm:ss.xxx]
const LRC_TIMESTAMP_RE = /^\[(\d{1,2}:\d{2}(?:[.:]\d{2,3})?)\](.*)$/;
// Matches a section header: [Any text] on its own line
const SECTION_HEADER_RE = /^\[(.+)\]$/;

/**
 * Parse a raw plain-text lyrics string into editor lines, recognising:
 *  - LRC timestamps:  [00:12.34] lyric text
 *  - Section headers: [Verse], [Chorus: Singer], [Bridge: A & B]
 *  - Regular lines:   plain lyric text
 *
 * Handles non-English section names (e.g. Puente, Estribillo) — they get
 * depth 1 (unknown label) and any singers specified after the colon.
 */
export function parseRawLyricsText(text: string): Array<Record<string, unknown>> {
  const lines = text.split('\n');
  const result: Array<Record<string, unknown>> = [];

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

    // ── Section header ──────────────────────────────────────────────────────
    const secMatch = line.match(SECTION_HEADER_RE);
    if (secMatch) {
      const inner = secMatch[1].trim(); // e.g. "Bridge: A & B" or "Chorus"
      const colonIdx = inner.indexOf(':');

      let label: string;
      let singers: string[] | undefined;

      if (colonIdx !== -1 && !isStructuralSection(inner.slice(0, colonIdx).trim())) {
        // Non-structural: text after colon is singers, not a subtitle
        label = inner.slice(0, colonIdx).trim();
        const singerPart = inner.slice(colonIdx + 1).trim();
        if (singerPart) {
          singers = singerPart
            .split(/\s*&\s*/)
            .map(s => s.trim())
            .filter(Boolean);
        }
      } else {
        // Structural (e.g. [Part I: Title]) or no colon — full string is label
        label = inner;
      }

      result.push({
        type: 'section',
        label,
        depth: getDefaultDepthForLabel(label),
        singers,
        timestamp: null,
        text: '',
        id: crypto.randomUUID(),
      });
      continue;
    }

    // ── Regular lyric line ──────────────────────────────────────────────────
    result.push({
      text: line,
      timestamp: null,
      endTime: null,
      secondary: '',
      translation: '',
      id: crypto.randomUUID(),
    });
  }

  return result;
}
