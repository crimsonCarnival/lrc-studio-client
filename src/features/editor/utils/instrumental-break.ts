/**
 * Shortest instrumental gap worth showing, in seconds.
 *
 * Below this the break is over before the dots have filled: the row appears and
 * vanishes in the time it takes to read it, which looks like the lyrics
 * flickering rather than like a pause in the song.
 */
export const MIN_INSTRUMENTAL_SECONDS = 4;

/**
 * Whether an empty line's gap earns a visible instrumental break.
 *
 * A gap that cannot be measured — an unsynced line, or the last line of a
 * project — is not hidden; only one we know to be short. Lives beside the
 * components rather than inside InstrumentalDots so the preview and the public
 * viewer share one threshold instead of each carrying their own.
 */
export function showsInstrumentalBreak(gapSeconds: number | null | undefined): boolean {
  return gapSeconds == null || gapSeconds >= MIN_INSTRUMENTAL_SECONDS;
}
