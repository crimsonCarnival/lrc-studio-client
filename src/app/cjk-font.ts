/**
 * On-demand loader for the CJK fallback face (Noto Serif JP).
 *
 * Why this is not a plain `@import` in index.css: the font ships as 124
 * unicode-range slices, and those @font-face rules are 105 KB raw / 31 KB gzipped
 * before a single glyph is downloaded. index.css blocks the first paint, so putting
 * them there made every visitor — including the majority who never render a CJK
 * character — pay 31 KB to see the landing page. Measured against the Lighthouse
 * run that prompted this: it nearly doubled the blocking stylesheet.
 *
 * Loading it through a dynamic import instead puts the rules in their own chunk that
 * Vite injects as a <link> at runtime, which does not block rendering. The
 * `--font-sans` / `--font-heading` / `--font-lyrics` stacks already name
 * "Noto Serif JP Variable" (the name @fontsource-variable declares — not the bare
 * "Noto Serif JP" that Google Fonts used), so CJK text re-renders in it the moment
 * this resolves; until then it falls through to the platform CJK face.
 */

let pending: Promise<void> | null = null;

/**
 * Load the CJK fallback stylesheet. Idempotent and safe to call on every keystroke:
 * repeat calls return the same in-flight (or settled) promise rather than queueing
 * another import.
 *
 * A failure is swallowed deliberately — this is a typographic upgrade, not content.
 * If the chunk 404s (a stale tab after a deploy, say), CJK text still renders in the
 * platform fallback and nothing user-facing breaks. The promise is kept rather than
 * reset so a permanently-missing chunk is not re-fetched on every call.
 */
export function loadCjkFont(): Promise<void> {
  pending ??= import('@fontsource-variable/noto-serif-jp/index.css').then(
    () => undefined,
    () => undefined,
  );
  return pending;
}
