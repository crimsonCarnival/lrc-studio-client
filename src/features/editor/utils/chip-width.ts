/**
 * Word-chip widths snap to a 32px grid instead of hugging their text.
 *
 * Sizing a chip to its content gives every word a different width — "I" at 36px
 * next to "dreamers" at 140px, with CJK squares breaking the rhythm again — so a
 * row of chips reads as noise. Rounding up to the next step yields a handful of
 * recognisable widths that all land on one grid.
 *
 * The step is resolved when a line is tokenized, never measured during playback,
 * so the content width is estimated from glyph counts rather than the DOM: at the
 * 18px chip face a latin glyph runs about 10px and a CJK glyph a full em.
 */
const STEP = 32;
const MIN_WIDTH = 64;
const SIDE_PADDING = 24;
// Measured against the 18px bold face the chip actually renders in: 10px per
// glyph left "damn" touching both edges of its box.
const LATIN_GLYPH = 11;
const CJK_GLYPH = 18;

const CJK_GLYPH_RE = /[\u3040-\u9FFF\uF900-\uFAFF\uFF01-\uFF60]/;

function estimateTextWidth(text: string): number {
  let width = 0;
  for (const ch of text) width += CJK_GLYPH_RE.test(ch) ? CJK_GLYPH : LATIN_GLYPH;
  return width;
}

/**
 * Width in px for a chip holding `word`, and optionally a romaji reading stacked
 * under it — the chip has to fit whichever layer is wider, so that switching the
 * visible layer never resizes it.
 */
export function chipWidthStep(word?: string, romaji?: string | null): number {
  // Both layers are measured at the 18px face, because either one can be the
  // face: in Romaji mode the reading moves up into it and the Japanese drops
  // underneath. Measuring the romaji at its 11.5px mono size — which is only
  // what it costs while it is the *under* layer — sized "mezashite" to the 96px
  // its kanji needed and let the reading run out of the box.
  const content = Math.max(
    estimateTextWidth(word ?? ''),
    estimateTextWidth(romaji ?? ''),
  );
  if (!content) return MIN_WIDTH;
  const stepped = Math.ceil((content + SIDE_PADDING) / STEP) * STEP;
  return Math.max(MIN_WIDTH, stepped);
}
