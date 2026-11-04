/**
 * On-demand loader for the CJK fallback faces (Noto Serif JP / SC / TC / KR).
 *
 * Why this is not a plain `@import` in index.css: CJK fonts ship as many
 * unicode-range slices, and those @font-face rules are heavy before a single glyph
 * is downloaded. index.css blocks the first paint, so putting them there made every
 * visitor — including the majority who never render a CJK character — pay the payload
 * to see the landing page.
 *
 * Loading them through dynamic imports puts the rules in their own chunks that
 * Vite injects as <link>s at runtime, which do not block rendering. The font stacks
 * in index.css name the "Variable" faces as well as local CJK system fallbacks.
 */

let pending: Promise<void> | null = null;

/**
 * Load the CJK fallback stylesheets. Idempotent and safe to call on every keystroke:
 * repeat calls return the same in-flight (or settled) promise rather than queueing
 * another import.
 *
 * A failure is swallowed deliberately — this is a typographic upgrade, not content.
 * If the chunks 404 (a stale tab after a deploy, say), CJK text still renders in the
 * platform fallback and nothing user-facing breaks. The promise is kept rather than
 * reset so a permanently-missing chunk is not re-fetched on every call.
 */
export function loadCjkFont(): Promise<void> {
  pending ??= Promise.all([
    import('@fontsource-variable/noto-serif-jp/index.css'),
    import('@fontsource-variable/noto-serif-sc/index.css'),
    import('@fontsource-variable/noto-serif-tc/index.css'),
    import('@fontsource-variable/noto-serif-kr/index.css'),
  ]).then(
    () => undefined,
    () => undefined,
  );
  return pending;
}
