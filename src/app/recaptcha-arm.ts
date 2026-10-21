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
 * Runs executeRecaptcha, retrying for a few seconds and falling back to grecaptcha.execute.
 *
 * The hook reports a script as loaded (executeRecaptcha truthy) slightly before the
 * badge's grecaptcha.render() callback assigns its real client id. Calling execute in
 * that gap throws synchronously ("Invalid reCAPTCHA client id: ''"), which a plain
 * `.catch()` on the call does not see since the throw happens before a promise exists.
 * Retries (and the client-id-free direct call) cover that race; exhausting them degrades to no token.
 */
export async function executeRecaptchaSafe(
  executeRecaptcha: ((action: string) => Promise<string>) | undefined,
  action: string
): Promise<string | undefined> {
  if (!executeRecaptcha) return undefined;
  const siteKey = import.meta.env.VITE_RECAPTCHA_KEY as string | undefined;
  // The hook's client id can stay unassigned for a few seconds after the script
  // loads (badge render is slow on a cold page), so one 300 ms retry is not
  // enough. grecaptcha.execute(siteKey, ...) works without a client id, so use
  // it as a fallback and keep trying for a few seconds before giving up.
  const attempts = 6;
  for (let i = 0; i < attempts; i++) {
    try {
      return await executeRecaptcha(action);
    } catch (err) {
      if (i === attempts - 1) console.warn('reCAPTCHA execute failed:', err);
    }
    const g = (window as unknown as { grecaptcha?: { ready?: (cb: () => void) => void; execute?: (key: string, o: { action: string }) => Promise<string> } }).grecaptcha;
    if (g?.execute && siteKey) {
      try {
        return await new Promise<string>((resolve, reject) => {
          const run = () => g.execute!(siteKey, { action }).then(resolve, reject);
          if (g.ready) g.ready(run); else run();
        });
      } catch { /* fall through to the delay and retry */ }
    }
    await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)));
  }
  return undefined;
}
