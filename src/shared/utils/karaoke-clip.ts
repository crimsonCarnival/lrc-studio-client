/**
 * The clip that reveals a karaoke fill: the lit copy of a word is shown from its left edge up
 * to `fill` (0 to 1) of its width.
 *
 * The clip reaches past the word's box on the top, bottom and left (and on the right once the
 * word is fully sung) by --karaoke-bleed (index.css). A plain `inset(0 …)` clipped to the box
 * itself, which cut off whatever a glyph draws outside it (a tall capital, a descender, an
 * italic overhang) and cut the glow into a hard-edged rectangle around every word.
 */
export const KARAOKE_BLEED = 'var(--karaoke-bleed)';

export function karaokeClipPath(fill: number): string {
  const f = Number.isFinite(fill) ? Math.max(0, Math.min(1, fill)) : 0;
  const right = f >= 1 ? KARAOKE_BLEED : `${(1 - f) * 100}%`;
  return `inset(${KARAOKE_BLEED} ${right} ${KARAOKE_BLEED} ${KARAOKE_BLEED})`;
}

/** The style for a fill element: the clip with its WebKit twin. */
export function karaokeClipStyle(fill: number): { clipPath: string; WebkitClipPath: string } {
  const clip = karaokeClipPath(fill);
  return { clipPath: clip, WebkitClipPath: clip };
}
