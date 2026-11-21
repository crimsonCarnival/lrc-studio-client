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

export type KaraokeFillStyle = 'glow' | 'plain';
export type KaraokeFillEasing = 'linear' | 'ease-in-out';

/** The viewer's fill preferences (editor.display), with the defaults for anything unset or unknown. */
export function karaokeFillPrefs(display: { karaokeFillStyle?: unknown; karaokeFillEasing?: unknown } | null | undefined): {
  style: KaraokeFillStyle;
  easing: KaraokeFillEasing;
} {
  return {
    style: display?.karaokeFillStyle === 'plain' ? 'plain' : 'glow',
    easing: display?.karaokeFillEasing === 'ease-in-out' ? 'ease-in-out' : 'linear',
  };
}

/**
 * How far across a word the fill has moved, from how far through the word the song is. Linear
 * keeps pace with the singing; ease-in-out starts and lands gently on each word.
 */
export function easeKaraokeFill(progress: number, easing: KaraokeFillEasing): number {
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  return easing === 'ease-in-out' ? 0.5 - Math.cos(Math.PI * p) / 2 : p;
}

/** The class that gives the sung part its halo, or none for the plain style. */
export function karaokeFillGlowClass(style: KaraokeFillStyle): string {
  return style === 'plain' ? '' : 'karaoke-fill-glow';
}

/** The CSS timing function for fills drawn by a CSS animation (the editor's words mode). */
export function karaokeFillTiming(easing: KaraokeFillEasing): string {
  return easing === 'ease-in-out' ? 'ease-in-out' : 'linear';
}
