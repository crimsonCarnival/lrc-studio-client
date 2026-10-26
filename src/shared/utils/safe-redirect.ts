/**
 * Turns a `?redirect=` value into an in-app path, or `fallback` when it points
 * anywhere else.
 *
 * A prefix check (`startsWith('/') && !startsWith('//')`) is not enough: the
 * URL parser turns `/\evil.com` and `/<TAB>/evil.com` into `//evil.com`, and a
 * non-path value like `javascript:…` assigned to `location.href` runs as script
 * in this origin. Resolving against our own origin and comparing origins
 * covers every spelling the browser itself would accept.
 */
export function safeRedirectPath(raw: string | null | undefined, fallback: string, origin = window.location.origin): string {
  if (!raw) return fallback;
  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin) return fallback;
    // Same origin, yet the returned string is reused as a URL: a pathname of
    // `//evil.com` (from `/.//evil.com` or `${origin}//evil.com`) reads as
    // protocol-relative when assigned to location.href.
    if (url.pathname.startsWith('//')) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
