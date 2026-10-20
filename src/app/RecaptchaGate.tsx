import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { arm, subscribe, isArmed as readArmed, needsRecaptchaOnArrival } from '@/app/recaptcha-arm';

/**
 * Defers loading reCAPTCHA until something could actually need a token.
 *
 * The provider injects Google's script the moment it mounts, and that script is ~695 KB
 * with ~290 ms of main-thread work — paid on every page view, including the landing page,
 * which has no form on it. It also drags in two extra gstatic requests and a Roboto font.
 *
 * Why this is not simply "mount it on the routes that need it": the server rejects a
 * MISSING token, not just a bad one (verifyRecaptcha in auth.service.ts returns false on
 * `!token`), and it gates register, login, project creation and all four upload paths. The
 * client's `if (executeRecaptcha)` guards therefore do not degrade gracefully in
 * production — they just send no token and the request fails. Being wrong about a route
 * means a user cannot sign up or upload, so the gate is deliberately eager:
 *
 *   - routes where a token can be needed with no interaction at all (an authenticated
 *     visitor landing on /project/local migrates their draft, which creates a project)
 *     arm it on arrival;
 *   - everywhere else arms on the first pointer or key event, which necessarily precedes
 *     any action that submits something.
 *
 * What is left unarmed is the read-only public surface — landing, explore, search,
 * leaderboard, public profiles and project views — which is exactly where the cost was
 * pure waste.
 *
 * The provider itself stays mounted the whole time and only its key changes. Swapping
 * between `<>{children}</>` and `<Provider>{children}</Provider>` would change the
 * element type at this position and remount the entire app — router, auth and editor
 * state included — the first time anyone clicked. The library injects the script from an
 * effect guarded by `if (reCaptchaKey)` with the key in its dependency array, and reports
 * `executeRecaptcha: undefined` until the script resolves, so an empty key is a supported
 * idle state and the existing `if (executeRecaptcha)` guards stay correct.
 */

/** Arms the gate when the router reaches a path that may need a token on arrival. */
export function RecaptchaRouteArmer() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (needsRecaptchaOnArrival(pathname)) arm();
  }, [pathname]);
  return null;
}

export function RecaptchaGate({ children }: { children: ReactNode }) {
  const isArmed = useSyncExternalStore(subscribe, readArmed, () => false);

  useEffect(() => {
    if (isArmed) return;
    const onInteract = () => arm();
    const opts = { once: true, passive: true } as const;
    window.addEventListener('pointerdown', onInteract, opts);
    window.addEventListener('keydown', onInteract, opts);
    window.addEventListener('touchstart', onInteract, opts);
    return () => {
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
      window.removeEventListener('touchstart', onInteract);
    };
  }, [isArmed]);

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={isArmed ? import.meta.env.VITE_RECAPTCHA_KEY : ''}
      scriptProps={{ defer: true, async: true, appendTo: 'head' }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}
