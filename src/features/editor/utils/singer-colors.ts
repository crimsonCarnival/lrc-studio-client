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
