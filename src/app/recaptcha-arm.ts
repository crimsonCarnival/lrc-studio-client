// Arming state for the reCAPTCHA gate. Split out of RecaptchaGate.tsx because that
// file may only export components (react-refresh/only-export-components).
// See RecaptchaGate.tsx for why loading is deferred at all.

let armed = false;
const listeners = new Set<() => void>();

export function arm(): void {
  if (armed) return;
  armed = true;
  for (const l of listeners) l();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Whether a visit to this path can need a token before the user has interacted.
 * Default TRUE: a path nobody thought about arms reCAPTCHA rather than breaking a
 * submission. Only the read-only public pages opt out.
 */
export function needsRecaptchaOnArrival(pathname: string): boolean {
  const p = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (p === '/') return false;
  if (p === '/leaderboard') return false;
  if (/^\/(explore|search)(\/.*)?$/.test(p)) return false;
  // Public profile (/:accountName), public list and public project view. The /edit and
  // /fork variants fall through to true, which is what we want.
  if (/^\/[^/]+$/.test(p)) return false;
  if (/^\/[^/]+\/(lists|projects)\/[^/]+$/.test(p)) return false;
  if (/^\/(profile|u)\/[^/]+(\/(lists|playlists)\/[^/]+)?$/.test(p)) return false;
  return true;
}

/** Snapshot for useSyncExternalStore. */
export function isArmed(): boolean {
  return armed;
}

/**
 * Runs executeRecaptcha, retrying once after a short delay.
 *
 * The hook reports a script as loaded (executeRecaptcha truthy) slightly before the
 * badge's grecaptcha.render() callback assigns its real client id. Calling execute in
 * that gap throws synchronously ("Invalid reCAPTCHA client id: ''"), which a plain
 * `.catch()` on the call does not see since the throw happens before a promise exists.
 * One retry covers that race; a second failure degrades to no token, same as before.
 */
export async function executeRecaptchaSafe(
  executeRecaptcha: ((action: string) => Promise<string>) | undefined,
  action: string
): Promise<string | undefined> {
  if (!executeRecaptcha) return undefined;
  try {
    return await executeRecaptcha(action);
  } catch (err) {
    console.warn('reCAPTCHA execute failed, retrying:', err);
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
  try {
    return await executeRecaptcha(action);
  } catch (err) {
    console.warn('reCAPTCHA execute failed:', err);
    return undefined;
  }
}
