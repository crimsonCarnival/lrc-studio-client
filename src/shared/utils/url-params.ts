/**
 * Content deep-link parameters.
 *
 * These describe *what the viewer should be looking at* — a playback position,
 * an A-B loop — as opposed to the viewer's own UI preferences. Only this
 * category belongs in a shared URL, so only this category lives here.
 *
 * Contract (see the URL API conventions in the project docs):
 * - A malformed or out-of-range value is ignored and yields `null`. It is never
 *   coerced to a default and the URL is never rewritten to "correct" it, because
 *   rewriting is what silently destroyed the `?view=public` and `?focus=` deep
 *   links on the profile and settings pages.
 * - Upper bounds that depend on media duration or line count are not known here.
 *   Callers clamp; this module only rejects values that are invalid in principle.
 */

export type DeepLinkLoop = {
  a: number;
  b: number;
};

export type DeepLink = {
  /** `?s=` — playback position in seconds. */
  seek: number | null;
  /** `?loop=a-b` — A-B loop bounds in seconds. */
  loop: DeepLinkLoop | null;
};

/** Finite, non-negative seconds. Rejects NaN, Infinity, negatives and junk. */
function parseSeconds(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  // Number() rather than parseFloat() so trailing junk ("12abc") is rejected
  // instead of silently truncated — parseInt('1e5') returning 1 is the kind of
  // quiet wrong answer this API should not have.
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function parseLoop(raw: string | null): DeepLinkLoop | null {
  if (!raw) return null;
  const parts = raw.split('-');
  if (parts.length !== 2) return null;
  const a = parseSeconds(parts[0]);
  const b = parseSeconds(parts[1]);
  if (a === null || b === null) return null;
  // A zero-length or inverted loop would trap playback, so it is not a valid
  // loop rather than something to be normalised.
  if (b <= a) return null;
  return { a, b };
}

export function parseDeepLink(search: string | URLSearchParams): DeepLink {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  return {
    seek: parseSeconds(params.get('s')),
    loop: parseLoop(params.get('loop')),
  };
}

/** Serialises a loop back to its `?loop=` form. Mirrors `parseLoop`. */
export function formatLoopParam(a: number, b: number): string {
  const round = (n: number) => String(Math.round(n * 100) / 100);
  return `${round(a)}-${round(b)}`;
}
