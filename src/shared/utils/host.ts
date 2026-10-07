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

/** True on the production domain, where the admin host exists (not on previews/localhost). */
export function canUseAdminHost(): boolean {
  return /^(www\.|m\.|admin\.)?lrcstudio\.app$/i.test(hostname());
}

/** Absolute URL for `path` on the admin host, derived by swapping the leading label. */
export function adminHostUrl(path = '/'): string {
  const host = window.location.hostname.replace(/^(www|m)\./i, '');
  return `${window.location.protocol}//admin.${host}${window.location.port ? `:${window.location.port}` : ''}${path}`;
}

/** Absolute URL for `path` on the canonical host, leaving the admin host. */
export function wwwHostUrl(path = '/'): string {
  const host = window.location.hostname.replace(/^admin\./i, 'www.');
  return `${window.location.protocol}//${host}${window.location.port ? `:${window.location.port}` : ''}${path}`;
}

/** `www.lrcstudio.app` — the canonical host the mobile variant falls back to. */
function canonicalHost(): string {
  // Swap the leading `m.` label rather than hardcoding the domain, so this keeps
  // working on previews and any future domain without another edit.
  return window.location.hostname.replace(/^m\./i, 'www.');
}

/**
 * Opt-out so the mobile variant stays reachable from a desktop browser. Without
 * it the layout cannot be opened for testing or debugging on the machines it is
 * most likely to be developed on. Sticky for the tab, so in-app navigation does
 * not bounce after the first load.
 */
const STAY_PARAM = 'stay';
const STAY_KEY = 'lrc-stay-on-mobile-host';

function wantsToStay(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get(STAY_PARAM) === '1') {
      sessionStorage.setItem(STAY_KEY, '1');
      return true;
    }
    return sessionStorage.getItem(STAY_KEY) === '1';
  } catch {
    // Private mode or blocked storage: fall back to the per-load answer only.
    return new URLSearchParams(window.location.search).get(STAY_PARAM) === '1';
  }
}

/**
 * True when the mobile host was opened by something that is not a phone.
 *
 * "Mobile" here means the same thing `useInputMethod` calls `touch`: a coarse
 * pointer with no hover. Screen width is deliberately not consulted — a desktop
 * browser at 400px wide is still a desktop, and the narrow layout is already
 * served to it responsively on www. A hybrid device (touch laptop) counts as
 * not-mobile: it has the room and the pointer for the full layout.
 *
 * UA sniffing is avoided on purpose; it misreports iPads and every device
 * released after the string was written.
 */
export function shouldLeaveMobileHost(): boolean {
  if (!isMobileHost()) return false;
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  if (wantsToStay()) return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const hover = window.matchMedia('(hover: hover)').matches;
  const isTouchOnly = coarse && !hover;
  return !isTouchOnly;
}

/**
 * Sends a non-phone visitor from `m.` to the canonical host, preserving the
 * path, query and hash so a shared project link still lands where it should.
 * `replace` rather than `assign` so Back does not bounce them straight back.
 */
export function redirectOffMobileHostIfNeeded(): void {
  if (!shouldLeaveMobileHost()) return;
  const { pathname, search, hash } = window.location;
  window.location.replace(`https://${canonicalHost()}${pathname}${search}${hash}`);
}

/**
 * Sends a phone from the canonical host to `m.`, preserving path, query and
 * hash. Production domain only (previews/localhost are left alone) and the
 * mirror image of `redirectOffMobileHostIfNeeded`: both use the same
 * touch-only test, so the two redirects can never ping-pong. `?desktop=1`
 * opts out for the tab, so the full site stays reachable from a phone.
 */
export function redirectToMobileHostIfNeeded(): void {
  if (typeof window === 'undefined' || !window.matchMedia) return;
  if (!/^(www\.)?lrcstudio\.app$/i.test(hostname())) return;
  const KEY = 'lrc-stay-on-desktop-host';
  const asked = new URLSearchParams(window.location.search).get('desktop') === '1';
  try {
    if (asked) sessionStorage.setItem(KEY, '1');
    if (sessionStorage.getItem(KEY) === '1') return;
  } catch {
    if (asked) return;
  }
  const isTouchOnly = window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(hover: hover)').matches;
  if (!isTouchOnly) return;
  const { pathname, search, hash } = window.location;
  const host = window.location.hostname.replace(/^www\./i, '');
  window.location.replace(`https://m.${host}${pathname}${search}${hash}`);
}
