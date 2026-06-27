import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { auth, google as googleApi, setAuthFlag } from '@/app/api';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import toast from 'react-hot-toast';
import { authEvents } from '@/shared/utils/auth-events';
import { STORAGE_KEYS, storage } from '@/features/projects/services/storage.service';
import { rememberedAccounts } from '@/features/auth/services/remembered-accounts.service';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import type { User } from '@/types/graphql';

// Migrate legacy single-account format to multi-account array on first load
rememberedAccounts.migrate();

// Real server origin (not the Vite/Vercel proxy path) for OAuth postMessage validation
const apiUrl = import.meta.env.VITE_API_URL || '';
const API_ORIGIN = import.meta.env.VITE_SERVER_ORIGIN || (apiUrl ? new URL(apiUrl).origin : window.location.origin);

// Paints a themed spinner into a freshly opened OAuth popup so it doesn't flash a
// blank white window while we fetch the provider URL. The popup is an isolated
// about:blank document with no access to the app's CSS variables, so the theme
// colors (zinc-950 bg, primary lavender) are inlined here on purpose.
// Mirrors the server `User` (the /me shape) with auth-only extras. Partial<User>
// because the client sometimes holds a subset (guest, optimistic updates).
export interface AuthUser extends Partial<User> {
  _id?: string;
  isGuest?: boolean;
  permissions?: string[];
  [key: string]: unknown;
}

interface AuthInternalState {
  user: AuthUser | null;
  loading: boolean;
  heldLoginResult: unknown;
}

interface ApiError {
  status?: number;
  message?: string;
}

function renderPopupLoading(popup: Window | null) {
  if (!popup) return;
  try {
    const doc = popup.document;
    // Built with DOM APIs + textContent (no innerHTML / document.write) — the
    // content is static but this keeps it XSS-proof by construction.
    const style = doc.createElement('style');
    style.textContent =
      'html,body{height:100%;margin:0;background:#1a1826;display:flex;' +
      'align-items:center;justify-content:center}.s{width:38px;height:38px;' +
      'border-radius:50%;border:3px solid rgba(196,167,231,.18);' +
      'border-top-color:#c4a7e7;animation:lrcspin .8s linear infinite}' +
      '@keyframes lrcspin{to{transform:rotate(360deg)}}' +
      '@media(prefers-reduced-motion:reduce){.s{animation:none;opacity:.6}}';
    doc.head.appendChild(style);
    const spinner = doc.createElement('div');
    spinner.className = 's';
    doc.body.appendChild(spinner);
  } catch {
    // Popup already navigated / cross-origin — nothing to paint.
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthInternalState>({ user: null, loading: true, heldLoginResult: null });
  const [wasJustUnbanned, setWasJustUnbanned] = useState(false);
  const user = state.user;
  const loading = state.loading;
  const setUser = useCallback((u: AuthUser | null | ((prev: AuthUser | null) => AuthUser | null)) => setState(s => ({ ...s, user: typeof u === 'function' ? (u as (prev: AuthUser | null) => AuthUser | null)(s.user) : u })), []);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  // Holds the single in-flight refresh promise so concurrent callers coalesce.
  const refreshPromiseRef = useRef<Promise<unknown> | null>(null);
  // True once a real user has been present this session. Gates the "session
  // expired" toast + hard redirect so a logged-out visitor's cold restore
  // (remembered accounts, no live session) fails silently instead of looping.
  const wasAuthedRef = useRef(false);
  const { executeRecaptcha } = useGoogleReCaptcha();

  // Coalesce refresh into ONE network request. Two refreshes racing the same
  // rotating refresh token poison the server's token rotation — breach detection
  // then invalidates ALL sessions, which is the root of premature logouts.
  const doRefresh = useCallback(() => {
    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = auth.refresh().finally(() => {
        refreshPromiseRef.current = null;
      });
    }
    return refreshPromiseRef.current;
  }, []);

  // Mark that the user was authenticated at some point this session.
  useEffect(() => {
    if (state.user) wasAuthedRef.current = true;
  }, [state.user]);

  const doLogout = useCallback(async () => {
    try {
      await auth.logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
    // Clear project data + settings so they don't persist across accounts
    storage.remove(STORAGE_KEYS.PROJECT);
    storage.remove(STORAGE_KEYS.SHARED_PROJECT);
    storage.remove(STORAGE_KEYS.ACTIVE_PROJECT_ID);
    storage.remove(STORAGE_KEYS.HAS_SESSION);
    storage.remove(STORAGE_KEYS.SETTINGS);
    setAuthFlag(false);
    // Intentionally keep remembered accounts — they are UI metadata only.
    // The server cleared the refresh token cookie via POST /auth/logout.
    // On next visit, the user sees the account picker and re-enters their password.
    setState({ user: null, loading: false, heldLoginResult: null });
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  // Schedule a token refresh at 75% of the access token lifetime (22.5 min for 30 min token).
  // isRefreshingRef is shared with the token:expired handler to prevent concurrent refresh calls,
  // which would trigger the server's breach-detection path and invalidate all sessions.
  const scheduleRefreshRef = useRef<((expiresIn?: number) => void) | null>(null);
  const scheduleRefresh = useCallback((expiresIn = 22.5 * 60 * 1000) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      try {
        await doRefresh();
        scheduleRefreshRef.current?.();
      } catch (err) {
        // Network error, 5xx, or unexpected 4xx (e.g. infra 400) — retry in 2 min
        if (!(err as ApiError)?.status || ((err as ApiError).status ?? 0) >= 500 || ((err as ApiError).status !== 401 && (err as ApiError).status !== 403)) {
          isRefreshingRef.current = false;
          scheduleRefreshRef.current?.(2 * 60 * 1000);
          return;
        }
        // 401/403 — refresh token is actually dead, force logout
        await doLogout();
        toast.error('Your session has expired. Please sign in again.', {
          id: 'session-expired',
          duration: 6000,
        });
      } finally {
        isRefreshingRef.current = false;
      }
    }, expiresIn);
  }, [doLogout, doRefresh]);
  useLayoutEffect(() => { scheduleRefreshRef.current = scheduleRefresh; }, [scheduleRefresh]);

  // Restore project on mount — guarded against StrictMode double-fire
  const restoringRef = useRef(false);
  useEffect(() => {
    if (restoringRef.current) return;
    restoringRef.current = true;

    const clearStaleProjectData = () => {
      storage.remove(STORAGE_KEYS.PROJECT);
      storage.remove(STORAGE_KEYS.SHARED_PROJECT);
      storage.remove(STORAGE_KEYS.ACTIVE_PROJECT_ID);
      storage.remove(STORAGE_KEYS.SETTINGS);
    };

    const restore = async () => {
      // Prefer the session_hint cookie (set/cleared by the server alongside auth cookies)
      // so it expires with the refresh token and is never stale. Fall back to the
      // localStorage flag for sessions created before this cookie was introduced.
      const hasHintCookie = document.cookie.split(';').some(c => c.trim().startsWith('session_hint='));
      const hasSession = storage.get(STORAGE_KEYS.HAS_SESSION);
      const hasRememberedAccounts = rememberedAccounts.getAll().length > 0;

      if (!hasHintCookie && !hasSession && !hasRememberedAccounts) {
        setState(s => ({ ...s, user: null, loading: false, heldLoginResult: null }));
        return;
      }

      try {
        const me = await auth.meCore() as AuthUser & { wasJustUnbanned?: boolean };
        const { wasJustUnbanned: justUnbanned, ...user } = me;
        storage.set(STORAGE_KEYS.HAS_SESSION, '1');
        setAuthFlag(true);
        setState(s => ({ ...s, user, loading: false }));
        if (justUnbanned) setWasJustUnbanned(true);
        scheduleRefresh();
        rememberedAccounts.upsert({
          userId: user.id || '',
          accountName: user.accountName,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          identifier: user.email || user.accountName || "",
        });
      } catch (err) {
        if ((err as ApiError)?.status === 401) {
          try {
            await doRefresh();
            const me = await auth.meCore() as AuthUser & { wasJustUnbanned?: boolean };
            const { wasJustUnbanned: justUnbanned, ...user } = me;
            storage.set(STORAGE_KEYS.HAS_SESSION, '1');
            setAuthFlag(true);
            setState(s => ({ ...s, user, loading: false }));
            if (justUnbanned) setWasJustUnbanned(true);
            scheduleRefresh();
            rememberedAccounts.upsert({
              userId: user.id || '',
              accountName: user.accountName,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              identifier: user.email || user.accountName || "",
            });
          } catch {
            // Both tokens dead — wipe stale project data so a new login starts clean
            storage.remove(STORAGE_KEYS.HAS_SESSION);
            setAuthFlag(false);
            clearStaleProjectData();
            setState(s => ({ ...s, user: null, loading: false, heldLoginResult: null }));
          }
        } else if (!(err as ApiError)?.status || ((err as ApiError).status ?? 0) >= 500) {
          setState(s => ({ ...s, loading: false }));
        } else {
          storage.remove(STORAGE_KEYS.HAS_SESSION);
          setAuthFlag(false);
          clearStaleProjectData();
          setState(s => ({ ...s, user: null, loading: false, heldLoginResult: null }));
        }
      }
    };

    restore();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleRefresh, doRefresh]);

  // ——— Global token-expiry handler ———
  useEffect(() => {
    const unsub = authEvents.on('token:expired', async () => {
      if (isRefreshingRef.current) return; // de-duplicate concurrent events
      isRefreshingRef.current = true;
      try {
        await doRefresh();
        scheduleRefresh();
      } catch (err) {
        // Network error, 5xx, or unexpected 4xx — schedule a retry
        if (!(err as ApiError)?.status || ((err as ApiError).status ?? 0) >= 500 || ((err as ApiError).status !== 401 && (err as ApiError).status !== 403)) {
          isRefreshingRef.current = false;
          scheduleRefreshRef.current?.(30 * 1000); // retry in 30s
          return;
        }
        // 401/403 — refresh token is actually dead, force logout
        await doLogout();
        if (wasAuthedRef.current && !window.location.pathname.startsWith('/auth')) {
          toast.error('Your session has expired. Please sign in again.', {
            id: 'session-expired',
            duration: 6000,
          });
          window.location.href = '/auth?action=signin&from=session-expiration';
        }
      } finally {
        isRefreshingRef.current = false;
      }
    });
    return unsub;
  }, [doLogout, scheduleRefresh, doRefresh]);

  const handlePostAuthClone = useCallback(() => {
    const clonepublicId = storage.get(STORAGE_KEYS.CLONE_AFTER_AUTH);
    if (clonepublicId) {
      storage.remove(STORAGE_KEYS.CLONE_AFTER_AUTH);
      window.location.href = `/share/${clonepublicId}?clone=1`;
    }
  }, []);

  const login = useCallback(async ({ identifier, password }) => {
    let recaptchaToken: string | undefined = undefined;
    if (executeRecaptcha) {
      recaptchaToken = await executeRecaptcha('login');
    }

    const result = await auth.login({ identifier, password, recaptchaToken }) as { user: AuthUser };
    // Clear any stale project data from a previous session before setting the new user.
    // Prevents a different user's localStorage project from leaking into this session.
    storage.remove(STORAGE_KEYS.PROJECT);
    storage.remove(STORAGE_KEYS.SHARED_PROJECT);
    storage.remove(STORAGE_KEYS.ACTIVE_PROJECT_ID);
    storage.set(STORAGE_KEYS.HAS_SESSION, '1');
    setAuthFlag(true);
    setState(s => ({ ...s, user: result.user, loading: false }));
    scheduleRefresh();

    handlePostAuthClone();

    return result;
  }, [scheduleRefresh, executeRecaptcha, handlePostAuthClone]);

  // Variant of login that holds the user state — caller must call commitLogin() to finalise.
  // Used by the password login flow so AuthPage can show the "save info?" prompt first.
  // heldLoginResult lives inside the same state atom so commitLogin() is a single atomic update.
  const heldLoginResult = state.heldLoginResult;

  const loginAndHold = useCallback(async ({ identifier, password }) => {
    let recaptchaToken: string | undefined = undefined;
    if (executeRecaptcha) {
      recaptchaToken = await executeRecaptcha('login');
    }

    const result = await auth.login({ identifier, password, recaptchaToken }) as { user: AuthUser };
    storage.set(STORAGE_KEYS.HAS_SESSION, '1');
    setAuthFlag(true);
    scheduleRefresh();
    handlePostAuthClone();
    // Single setState: atomically sets heldLoginResult without changing user yet
    setState(s => ({ ...s, heldLoginResult: result }));
    return result;
  }, [scheduleRefresh, executeRecaptcha, handlePostAuthClone]);

  const commitLogin = useCallback(() => {
    setState(s => {
      if (!s.heldLoginResult) return s;
      // Single atomic update: set user + clear heldLoginResult in one render cycle
      return { user: (s.heldLoginResult as { user: AuthUser }).user, loading: false, heldLoginResult: null };
    });
  }, []);

  const register = useCallback(async ({ accountName, email, password }) => {
    let recaptchaToken: string | undefined = undefined;
    if (executeRecaptcha) {
      recaptchaToken = await executeRecaptcha('register');
    }

    const result = await auth.register({ accountName, email, password, recaptchaToken }) as { user: AuthUser };
    // Cookies are automatically set by the server. Just update user state.
    storage.set(STORAGE_KEYS.HAS_SESSION, '1');
    setAuthFlag(true);
    setState(s => ({ ...s, user: result.user, loading: false }));
    scheduleRefresh();

    // Handle post-auth continuation (e.g., after cloning a project)
    handlePostAuthClone();

    return result;
  }, [scheduleRefresh, executeRecaptcha, handlePostAuthClone]);

  const registerAndHold = useCallback(async ({ accountName, email, password, displayName }) => {
    let recaptchaToken: string | undefined = undefined;
    if (executeRecaptcha) {
      recaptchaToken = await executeRecaptcha('register');
    }

    const result = await auth.register({ accountName, email, password, displayName, recaptchaToken }) as { user: AuthUser };
    storage.set(STORAGE_KEYS.HAS_SESSION, '1');
    setAuthFlag(true);
    scheduleRefresh();
    handlePostAuthClone();
    setState(s => ({ ...s, heldLoginResult: result }));
    return result;
  }, [scheduleRefresh, executeRecaptcha, handlePostAuthClone]);

  // ——— Google connect / disconnect / login ———

  const connectGoogle = useCallback(async () => {
    const width = 500, height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    // Open synchronously so browsers don't block it as a non-gesture popup
    const popup = window.open('about:blank', 'google-auth', `width=${width},height=${height},left=${left},top=${top}`);
    renderPopupLoading(popup);
    const url = await googleApi.getAuthUrl();
    if (popup) popup.location.href = url; else window.open(url, 'google-auth', `width=${width},height=${height},left=${left},top=${top}`);

    return new Promise((resolve, reject) => {
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        window.removeEventListener('message', onMessage);
        clearTimeout(timeout);
      };

      const onMessage = async (event) => {
        if (event.origin !== API_ORIGIN) return;
        let data = event.data;
        if (typeof data === 'string') try { data = JSON.parse(data); } catch { return; }
        if (data?.type !== 'google-callback') return;
        cleanup();

        if (!data.success) {
          reject(new Error(data.error || 'Google connection failed'));
          return;
        }

        const { wasJustUnbanned: _wju, ...meUser } = await auth.me() as AuthUser & { wasJustUnbanned?: boolean };
        setState(s => ({ ...s, user: meUser }));
        resolve(meUser);
      };

      window.addEventListener('message', onMessage);
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Google auth popup was closed'));
      }, 60000);
    });
  }, []);

  const disconnectGoogle = useCallback(async () => {
    try {
      await googleApi.disconnect();
      const { wasJustUnbanned: _wju, ...meUser } = await auth.me() as AuthUser & { wasJustUnbanned?: boolean };
      setState(s => ({ ...s, user: meUser }));
    } catch (err) {
      if ((err as ApiError)?.status === 409 && err?.error === 'last_auth_method') {
        throw new Error('Cannot disconnect Google — it is your only sign-in method. Set a password first.');
      }
      throw err;
    }
  }, []);

  const loginWithGoogle = useCallback(async (loginHint) => {
    const width = 500, height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    // Open synchronously so browsers don't block it as a non-gesture popup
    const popup = window.open('about:blank', 'google-login', `width=${width},height=${height},left=${left},top=${top}`);
    renderPopupLoading(popup);
    // loginHint (a saved account's email) lets Google skip the chooser (#12)
    const url = await googleApi.getLoginUrl(loginHint);

    // Popup blocked (Brave, strict Edge) — fall back to redirect-based flow.
    // The server callback will redirect to /auth/signin?gcb=success|error.
    if (!popup || popup.closed) {
      // Prime the session hint so restore() tries auth.me() after the OAuth redirect
      // instead of short-circuiting (new users have no HAS_SESSION or remembered accounts).
      storage.set(STORAGE_KEYS.HAS_SESSION, '1');
      window.location.href = url;
      return new Promise((_, reject) => {
        setTimeout(() => reject(new Error('redirect_timeout')), 3000);
      });
    }

    popup.location.href = url;
    console.log('[AUTH] Google popup opened:', popup !== null, url);

    return new Promise((resolve, reject) => {
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        window.removeEventListener('message', onMessage);
        clearTimeout(timeout);
      };

      const onMessage = async (event) => {
        if (event.origin !== API_ORIGIN) return;
        let data = event.data;
        if (typeof data === 'string') try { data = JSON.parse(data); } catch { return; }
        if (data?.type !== 'google-callback') return;
        cleanup();

        if (!data.success) {
          reject(new Error(data.error || 'Google login failed'));
          return;
        }

        try {
          const { wasJustUnbanned: justUnbanned, ...me } = await auth.me() as AuthUser & { wasJustUnbanned?: boolean };
          storage.set(STORAGE_KEYS.HAS_SESSION, '1');
          setAuthFlag(true);
          setState(s => ({ ...s, user: me, loading: false }));
          if (justUnbanned) setWasJustUnbanned(true);
          scheduleRefresh();
          // Persist for the saved-account picker — the OAuth popup path doesn't
          // trigger restore(), so without this the account is never remembered.
          rememberedAccounts.upsert({
            userId: me.id || '',
            accountName: me.accountName,
            displayName: me.displayName,
            avatarUrl: me.avatarUrl,
            identifier: me.email || me.accountName || '',
          });
          resolve(me);
        } catch (err) {
          // auth.me() failed after OAuth succeeded — cookies are set but we couldn't
          // fetch the user profile. Reject so the caller can do a hard redirect instead.
          reject(err);
        }
      };

      window.addEventListener('message', onMessage);
      const timeout = setTimeout(() => {
        console.warn('[AUTH] Google popup timeout after 60s - no message received');
        cleanup();
        reject(new Error('Google login popup was closed'));
      }, 60000);
    });
  }, [scheduleRefresh]);

  // Fetches the heavy profile fields (bio, emailHistory, stats, streak, etc.) and
  // merges them into the auth user. Call this when the user opens settings.
  const refreshUserProfile = useCallback(async () => {
    try {
      const profile = await auth.meProfile();
      if (profile) setUser(prev => prev ? { ...prev, ...profile } : prev);
    } catch {
      // Non-critical — settings will show empty state for missing fields
    }
  }, [setUser]);

  const dismissUnbanMessage = useCallback(() => {
    setWasJustUnbanned(false);
  }, []);

  const removeStorageKeys = useCallback(() => {
    storage.remove(STORAGE_KEYS.PROJECT);
    storage.remove(STORAGE_KEYS.SHARED_PROJECT);
    storage.remove(STORAGE_KEYS.ACTIVE_PROJECT_ID);
    storage.remove(STORAGE_KEYS.HAS_SESSION);
    storage.remove(STORAGE_KEYS.SETTINGS);
  }, []);

  const logoutAllDevices = useCallback(async () => {
    try {
      await auth.logoutAll(false); // keepCurrent=false → clears all sessions + server cookie
    } catch (err) {
      console.error('Logout all failed:', err);
    }
    removeStorageKeys();
    setAuthFlag(false);
    setState(s => ({ ...s, user: null, loading: false, heldLoginResult: null }));
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, [removeStorageKeys]);

  const deactivateAccount = useCallback(async () => {
    try {
      await auth.deactivateAccount();
    } catch (err) {
      console.error('Deactivate failed:', err);
      throw err;
    }
    removeStorageKeys();
    setAuthFlag(false);
    setState(s => ({ ...s, user: null, loading: false, heldLoginResult: null }));
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, [removeStorageKeys]);

  // ——— WebAuthn / Passkeys ———

  const registerPasskey = useCallback(async () => {
    try {
      const { options } = await auth.getPasskeyRegistrationOptions() as { options: Parameters<typeof startRegistration>[0]['optionsJSON'] };
      console.log('[Passkey] registration options received:', { rpId: options.rp?.id, origin: window.location.origin });
      const attResp = await startRegistration({ optionsJSON: options });
      console.log('[Passkey] startRegistration succeeded, verifying with server...');
      await auth.verifyPasskeyRegistration(attResp);

      // Update remembered accounts to reflect passkey support
      if (state.user) {
        rememberedAccounts.upsert({
          userId: state.user.id || '',
          accountName: state.user.accountName,
          displayName: state.user.displayName,
          avatarUrl: state.user.avatarUrl,
          identifier: state.user.email || state.user.accountName || '',
          hasPasskey: true,
        });
      }
      return true;
    } catch (err) {
      if ((err as Error).name === 'NotAllowedError') {
        console.log('[Passkey] user cancelled registration.');
        return false;
      }
      console.error('[Passkey] registration failed:', (err as Error).name, (err as Error).message, err);
      throw err;
    }
  }, [state.user]);

  const loginWithPasskey = useCallback(async (identifier) => {
    try {
      const { options } = await auth.getPasskeyLoginOptions(identifier) as { options: Parameters<typeof startAuthentication>[0]['optionsJSON'] };
      const asseResp = await startAuthentication({ optionsJSON: options });
      const result = await auth.verifyPasskeyLogin(identifier, asseResp) as { user: AuthUser };
      
      storage.set(STORAGE_KEYS.HAS_SESSION, '1');
      setAuthFlag(true);
      setState(s => ({ ...s, user: result.user, loading: false }));
      scheduleRefresh();
      handlePostAuthClone();
      
      return result.user;
    } catch (err) {
      if ((err as Error).name === 'NotAllowedError') {
        return null;
      }
      if ((err as ApiError).status === 404 || (err as ApiError).status === 400) {
        const existing = rememberedAccounts.getAll().find(
          (a) => a.identifier === identifier || a.accountName === identifier
        );
        if (existing?.userId) {
          rememberedAccounts.upsert({ userId: existing.userId, hasPasskey: false });
        }
      }
      throw err;
    }
  }, [scheduleRefresh, handlePostAuthClone]);

  // Re-attempt a silent refresh whenever the tab becomes visible again.
  // The setTimeout-based scheduleRefresh can fire late (or not at all) if
  // the device slept or the tab was backgrounded, leaving the access token
  // expired by the time the user returns.
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      if (!user) return;
      try {
        await doRefresh();
        scheduleRefresh();
      } catch {
        // Refresh failed — the token:expired path handles logout
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user, doRefresh, scheduleRefresh]);

  return {
    user,
    setUser,
    loading,
    login,
    loginAndHold,
    commitLogin,
    heldLoginResult,
    register,
    registerAndHold,
    logout: doLogout,
    logoutAllDevices,
    connectGoogle,
    disconnectGoogle,
    loginWithGoogle,
    wasJustUnbanned,
    dismissUnbanMessage,
    loginWithPasskey,
    registerPasskey,
    deactivateAccount,
    refreshUserProfile,
  };
}

export type AuthState = ReturnType<typeof useAuth>;
