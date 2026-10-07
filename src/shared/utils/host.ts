/**
 * Hostname-based app variants.
 *
 * `m.` and `admin.` are served by the same Vercel deployment as `www` — same
 * bundle, same routes, same API proxy. They are presentation variants selected
 * by hostname, not separate applications, so nothing here may be treated as a
 * security boundary: `admin.` only changes where the app lands, and /admin is
 * still gated by route access rules on the client and `requirePermission` on
 * the server exactly as it is on `www`.
 *
 * Both subdomains require the session cookie to be scoped to the parent domain
 * (server-side `COOKIE_DOMAIN`), otherwise a login on `www` is not visible here.
 */

function hostname(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hostname.toLowerCase();
}

/** `m.lrcstudio.app` — always renders the single-column layout. */
export function isMobileHost(): boolean {
  return hostname().startsWith('m.');
}

/** `admin.lrcstudio.app` — lands on the admin dashboard instead of home. */
export function isAdminHost(): boolean {
  return hostname().startsWith('admin.');
}
