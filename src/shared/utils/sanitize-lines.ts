import type { EditorLine, EditorWord } from '@/features/editor/services/editor.service';

/**
 * Validates and normalizes untrusted lyric-line data into `EditorLine[]`.
 *
 * Every path that loads lines from outside the editor runs through this: server
 * project loads, shared-link payloads and localStorage restores. Input is
 * whatever the wire or storage happened to contain, so nothing is assumed —
 * malformed entries are dropped rather than repaired, and missing ids are
 * assigned so downstream code can key off line identity.
 *
 * Previously duplicated in `useProjectActions` and `useSharedProject`, where the
 * two copies had silently diverged: the sharing copy dropped `singers`, `depth`,
 * `mode` and per-word `singerIndex`, so opening a shared project lost all of its
 * singer assignments. Keep this the single implementation.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Finite numbers only — NaN and Infinity are treated as "unset", not as 0. */
function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && isFinite(value) ? value : null;
}

function sanitizeWords(raw: unknown, keepSingerIndex: boolean): EditorWord[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.flatMap((w) => {
    if (!isRecord(w)) return [];
    const word = typeof w.word === 'string' ? w.word : '';
    // A word with no text carries no timing information worth keeping.
    if (!word) return [];
    return [{
      word,
      time: finiteOrNull(w.time),
      ...(keepSingerIndex && w.singerIndex != null ? { singerIndex: w.singerIndex as number } : {}),
      ...(typeof w.reading === 'string' && w.reading ? { reading: w.reading } : {}),
    }];
  });
}

export function sanitizeLines(raw: unknown): EditorLine[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap<EditorLine>((l) => {
    if (!isRecord(l)) return [];

    if (l.type === 'section') {
      return [{
        type: 'section',
        label: typeof l.label === 'string' ? l.label : '',
        depth: typeof l.depth === 'number' ? l.depth : undefined,
        singers: Array.isArray(l.singers) ? (l.singers as string[]) : undefined,
        timestamp: finiteOrNull(l.timestamp),
        id: typeof l.id === 'string' ? l.id : crypto.randomUUID(),
      }];
    }

    // A lyric line without text is not a line.
    if (typeof l.text !== 'string') return [];

    return [{
      text: l.text,
      timestamp: finiteOrNull(l.timestamp),
      endTime: typeof l.endTime === 'number' && isFinite(l.endTime) ? l.endTime : undefined,
      secondary: typeof l.secondary === 'string' ? l.secondary : '',
      mode: typeof l.mode === 'string' ? (l.mode as EditorLine['mode']) : undefined,
      singers: Array.isArray(l.singers) ? (l.singers as string[]) : undefined,
      translations: Array.isArray(l.translations) ? (l.translations as EditorLine['translations']) : undefined,
      id: typeof l.id === 'string' ? l.id : crypto.randomUUID(),
      words: sanitizeWords(l.words, true),
      // The secondary track has no singer attribution of its own.
      secondaryWords: sanitizeWords(l.secondaryWords, false),
    }];
  });
}
