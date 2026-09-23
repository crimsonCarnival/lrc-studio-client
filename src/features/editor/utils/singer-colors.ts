/**
 * Identity-based singer color mapping. The color of a singer is decided by their
 * position in the song-wide, document-order distinct singer list — NOT by their
 * position within any single line's `singers[]`. Same artist → same color everywhere.
 */
export const SINGER_PALETTE_SIZE = 8;

/**
 * Stable palette index for a singer within a song.
 * @param name        singer name
 * @param songSingers distinct singer names in first-appearance order (see useEditor projectSingers)
 */
export function singerColorIndex(name: string, songSingers: string[]): number {
  const i = songSingers.indexOf(name);
  if (i === -1) return 0;
  return i % SINGER_PALETTE_SIZE;
}

/**
 * Builds the song-wide distinct singer roster that drives color identity.
 * Single source of truth so the editor and preview panes resolve a given
 * singer to the SAME palette index.
 *
 * Only considers singers explicitly set on lyric lines/sections — the song
 * artist metadata field is intentionally excluded (artists ≠ on-screen singers).
 *
 * Ordering: first-appearance, deduped, document order.
 *
 * @param lines       lines with optional `singers[]`
 * @param _songArtists kept for call-site compat but no longer used
 */
export function buildSingerRoster(
  lines: { singers?: string[] }[],
  _songArtists?: string[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines ?? []) {
    if (!line.singers) continue;
    for (const s of line.singers) {
      const name = s?.trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        result.push(name);
      }
    }
  }
  return result;
}

/**
 * Parallel gradient stop colors using CSS theme variables (Tailwind v4 tokens).
 * Index-aligned with the per-component palette class arrays.
 */
export const SINGER_GRADIENT_STOPS = [
  'var(--color-primary)',
  'var(--color-sky-400)',
  'var(--color-violet-400)',
  'var(--color-amber-400)',
  'var(--color-emerald-400)',
  'var(--color-rose-400)',
  'var(--color-cyan-400)',
  'var(--color-fuchsia-400)',
];

/** Builds a left-to-right linear gradient from a line's singers via the shared palette. */
export function singerGradient(singers: string[], roster: string[]): string {
  const stops = singers.map((n) => SINGER_GRADIENT_STOPS[singerColorIndex(n, roster)]);
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}
