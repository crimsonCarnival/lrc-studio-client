import { useState, useEffect, useCallback, useRef } from 'react';
import { auth, spotify as spotifyApi, google as googleApi, setAuthFlag } from '@/app/api';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import toast from 'react-hot-toast';
import { authEvents } from '@/shared/utils/auth-events';
import { STORAGE_KEYS, storage } from '@/features/projects/services/storage.service';
import { rememberedAccounts } from '@/features/auth/services/remembered-accounts.service';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

// Migrate legacy single-account format to multi-account array on first load
rememberedAccounts.migrate();

// Real server origin (not the Vite/Vercel proxy path) for OAuth postMessage validation
const apiUrl = import.meta.env.VITE_API_URL || '';
const API_ORIGIN = import.meta.env.VITE_SERVER_ORIGIN || (apiUrl ? new URL(apiUrl).origin : window.location.origin);

export function useAuth() {
  const [state, setState] = useState({ user: null, loading: true, heldLoginResult: null });
  const user = state.user;
  const loading = state.loading;
  const setUser = useCallback((u) => setState(s => ({ ...s, user: typeof u === 'function' ? u(s.user) : u })), []);
  
  const refreshTimerRef = useRef(null);
  const isRefreshingRef = useRef(false);
  // Holds the single in-flight refresh promise so concurrent callers coalesce.
  const refreshPromiseRef = useRef(null);
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
    // Clear project data so stale projects don't persist across accounts
    storage.remove(STORAGE_KEYS.PROJECT);
    storage.remove(STORAGE_KEYS.SHARED_PROJECT);
    storage.remove(STORAGE_KEYS.ACTIVE_PROJECT_ID);
    storage.remove(STORAGE_KEYS.HAS_SESSION);
    setAuthFlag(false);
    // Intentionally keep remembered accounts — they are UI metadata only.
    // The server cleared the refresh token cookie via POST /auth/logout.
    // On next visit, the user sees the account picker and re-enters their password.
    setState({ user: null, loading: false });
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  // Schedule a token refresh before the access token expires (default: 14 min for 15 min expiry).
  // isRefreshingRef is shared with the token:expired handler to prevent concurrent refresh calls,
  // which would trigger the server's breach-detection path and invalidate all sessions.
  const scheduleRefresh = useCallback((expiresIn = 14 * 60 * 1000) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      try {
        await doRefresh();
        scheduleRefresh();
      } catch {
        // Refresh failed — session fully expired, force logout with feedback
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

  // Restore project on mount — guarded against StrictMode double-fire
  const restoringRef = useRef(false);
  useEffect(() => {
    if (restoringRef.current) return;
    restoringRef.current = true;

    const restore = async () => {
      const hasSession = storage.get(STORAGE_KEYS.HAS_SESSION);
      const hasRememberedAccounts = rememberedAccounts.getAll().length > 0;

      // Skip round-trip entirely when there's no reason to expect a valid session
      if (!hasSession && !hasRememberedAccounts) {
        setState({ user: null, loading: false });
        return;
      }

      try {
        const user = await auth.me();
        storage.set(STORAGE_KEYS.HAS_SESSION, '1');
        setAuthFlag(true);
        setState({ user, loading: false });
        scheduleRefresh();
        // Keep remembered account data fresh
        rememberedAccounts.upsert({
          userId: user.id,
          accountName: user.accountName,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          identifier: user.email || user.accountName,
        });
      } catch (err) {
        if (err?.status === 401) {
          // Access token might be expired, try refreshing
          try {
            await doRefresh();
            const user = await auth.me();
            storage.set(STORAGE_KEYS.HAS_SESSION, '1');
            setAuthFlag(true);
            setState({ user, loading: false });
            scheduleRefresh();
            rememberedAccounts.upsert({
              userId: user.id,
              accountName: user.accountName,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              identifier: user.email || user.accountName,
            });
          } catch {
            // Both tokens invalid — clear session hint but keep remembered accounts
            storage.remove(STORAGE_KEYS.HAS_SESSION);
            setAuthFlag(false);
            setState({ user: null, loading: false });
          }
        } else {
          storage.remove(STORAGE_KEYS.HAS_SESSION);
          setAuthFlag(false);
          setState({ user: null, loading: false });
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
      } catch {
        // Both tokens are dead — force logout
        await doLogout();
        // Only surface the expiry + hard redirect for a user who was actually
        // authenticated this session, and never when already on /auth. During
        // a logged-out visitor's cold restore (remembered accounts, no live
        // session) refresh legitimately fails — redirecting here caused a reload
        // loop that broke saved-account/passkey login (#10).
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
    const cloneProjectId = storage.get(STORAGE_KEYS.CLONE_AFTER_AUTH);
    if (cloneProjectId) {
      storage.remove(STORAGE_KEYS.CLONE_AFTER_AUTH);
      window.location.href = `/share/${cloneProjectId}?clone=1`;
    }
  }, []);

  const login = useCallback(async ({ identifier, password }) => {
    let recaptchaToken = undefined;
    if (executeRecaptcha) {
      recaptchaToken = await executeRecaptcha('login');
    }

    const result = await auth.login({ identifier, password, recaptchaToken });
    // Cookies are automatically set by the server. Just update user state.
    storage.set(STORAGE_KEYS.HAS_SESSION, '1');
    setAuthFlag(true);
    setState({ user: result.user, loading: false });
    scheduleRefresh();

    handlePostAuthClone();

    return result;
  }, [scheduleRefresh, executeRecaptcha, handlePostAuthClone]);

  // Variant of login that holds the user state — caller must call commitLogin() to finalise.
  // Used by the password login flow so AuthPage can show the "save info?" prompt first.
  // heldLoginResult lives inside the same state atom so commitLogin() is a single atomic update.
  const heldLoginResult = state.heldLoginResult;

  const loginAndHold = useCallback(async ({ identifier, password }) => {
    let recaptchaToken = undefined;
    if (executeRecaptcha) {
      recaptchaToken = await executeRecaptcha('login');
    }

    const result = await auth.login({ identifier, password, recaptchaToken });
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
      return { user: s.heldLoginResult.user, loading: false, heldLoginResult: null };
    });
  }, []);

  const register = useCallback(async ({ accountName, email, password }) => {
    let recaptchaToken = undefined;
    if (executeRecaptcha) {
      recaptchaToken = await executeRecaptcha('register');
    }

    const result = await auth.register({ accountName, email, password, recaptchaToken });
    // Cookies are automatically set by the server. Just update user state.
    storage.set(STORAGE_KEYS.HAS_SESSION, '1');
    setAuthFlag(true);
    setState({ user: result.user, loading: false });
    scheduleRefresh();

    // Handle post-auth continuation (e.g., after cloning a project)
    handlePostAuthClone();

    return result;
  }, [scheduleRefresh, executeRecaptcha, handlePostAuthClone]);

  const registerAndHold = useCallback(async ({ accountName, email, password, displayName }) => {
    let recaptchaToken = undefined;
    if (executeRecaptcha) {
      recaptchaToken = await executeRecaptcha('register');
    }

    const result = await auth.register({ accountName, email, password, displayName, recaptchaToken });
    storage.set(STORAGE_KEYS.HAS_SESSION, '1');
    setAuthFlag(true);
    scheduleRefresh();
    handlePostAuthClone();
    setState(s => ({ ...s, heldLoginResult: result }));
    return result;
  }, [scheduleRefresh, executeRecaptcha, handlePostAuthClone]);

  // ——— Spotify connect / disconnect ———

  const connectSpotify = useCallback(async () => {
    // Open synchronously so browsers don't block it as a non-gesture popup
    const width = 500, height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open('about:blank', 'spotify-auth', `width=${width},height=${height},left=${left},top=${top}`);
    const url = await spotifyApi.getAuthUrl();
    if (popup) popup.location.href = url; else window.open(url, 'spotify-auth', `width=${width},height=${height},left=${left},top=${top}`);

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
        if (data?.type !== 'spotify-callback') return;
        cleanup();

        if (!data.success) { reject(new Error(data.error || 'Spotify connection failed')); return; }

        const me = await auth.me();
        setState(s => ({ ...s, user: me }));
        resolve(me);
      };

      window.addEventListener('message', onMessage);
      // Fallback timeout: if no message after 60s, assume popup was closed
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Spotify auth popup was closed'));
      }, 60000);
    });
  }, []);

  const disconnectSpotify = useCallback(async () => {
    await spotifyApi.disconnect();
    const me = await auth.me();
    setState(s => ({ ...s, user: me }));
  }, []);

  // ——— Google connect / disconnect / login ———

  const connectGoogle = useCallback(async () => {
    const width = 500, height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    // Open synchronously so browsers don't block it as a non-gesture popup
    const popup = window.open('about:blank', 'google-auth', `width=${width},height=${height},left=${left},top=${top}`);
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

        const me = await auth.me();
        setState(s => ({ ...s, user: me }));
        resolve(me);
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
      const me = await auth.me();
      setState(s => ({ ...s, user: me }));
    } catch (err) {
      if (err?.status === 409 && err?.error === 'last_auth_method') {
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
    // loginHint (a saved account's email) lets Google skip the chooser (#12)
    const url = await googleApi.getLoginUrl(loginHint);

    // Popup blocked (Brave, strict Edge) — fall back to redirect-based flow.
    // The server callback will redirect to /auth/signin?gcb=success|error.
    if (!popup || popup.closed) {
      window.location.href = url;
      return new Promise(() => {}); // Never resolves; navigation takes over
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

        const me = await auth.me();
        storage.set(STORAGE_KEYS.HAS_SESSION, '1');
        setAuthFlag(true);
        setState({ user: me, loading: false });
        scheduleRefresh();
        resolve(me);
      };

      window.addEventListener('message', onMessage);
      const timeout = setTimeout(() => {
        console.warn('[AUTH] Google popup timeout after 60s - no message received');
        cleanup();
        reject(new Error('Google login popup was closed'));
      }, 60000);
    });
  }, [scheduleRefresh]);

  const clearUnbanMessage = useCallback(async () => {
    await auth.clearUnbanMessage();
    setState(prev => ({ ...prev, user: prev.user ? { ...prev.user, showUnbanMessage: false } : null }));
  }, []);

  const logoutAllDevices = useCallback(async () => {
    try {
      await auth.logoutAll(false); // keepCurrent=false → clears all sessions + server cookie
    } catch (err) {
      console.error('Logout all failed:', err);
    }
    storage.remove(STORAGE_KEYS.PROJECT);
    storage.remove(STORAGE_KEYS.SHARED_PROJECT);
    storage.remove(STORAGE_KEYS.ACTIVE_PROJECT_ID);
    storage.remove(STORAGE_KEYS.HAS_SESSION);
    setAuthFlag(false);
    setState({ user: null, loading: false });
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  const deactivateAccount = useCallback(async () => {
    try {
      await auth.deactivateAccount();
    } catch (err) {
      console.error('Deactivate failed:', err);
      throw err;
    }
    storage.remove(STORAGE_KEYS.PROJECT);
    storage.remove(STORAGE_KEYS.SHARED_PROJECT);
    storage.remove(STORAGE_KEYS.ACTIVE_PROJECT_ID);
    storage.remove(STORAGE_KEYS.HAS_SESSION);
    setAuthFlag(false);
    setState({ user: null, loading: false });
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  // ——— WebAuthn / Passkeys ———

  const registerPasskey = useCallback(async () => {
    try {
      const { options } = await auth.getPasskeyRegistrationOptions();
      console.log('[Passkey] registration options received:', { rpId: options.rp?.id, origin: window.location.origin });
      const attResp = await startRegistration({ optionsJSON: options });
      console.log('[Passkey] startRegistration succeeded, verifying with server...');
      await auth.verifyPasskeyRegistration(attResp);

      // Update remembered accounts to reflect passkey support
      if (state.user) {
        rememberedAccounts.upsert({
          userId: state.user.id,
          accountName: state.user.accountName,
          displayName: state.user.displayName,
          avatarUrl: state.user.avatarUrl,
          identifier: state.user.email || state.user.accountName,
          hasPasskey: true,
        });
      }
      return true;
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        console.log('[Passkey] user cancelled registration.');
        return false;
      }
      console.error('[Passkey] registration failed:', err.name, err.message, err);
      throw err;
    }
  }, [state.user]);

  const loginWithPasskey = useCallback(async (identifier) => {
    try {
      const { options } = await auth.getPasskeyLoginOptions(identifier);
      const asseResp = await startAuthentication({ optionsJSON: options });
      const result = await auth.verifyPasskeyLogin(identifier, asseResp);
      
      storage.set(STORAGE_KEYS.HAS_SESSION, '1');
      setAuthFlag(true);
      setState({ user: result.user, loading: false });
      scheduleRefresh();
      handlePostAuthClone();
      
      return result.user;
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        return null;
      }
      if (err.status === 404 || err.status === 400) {
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
    connectSpotify,
    disconnectSpotify,
    connectGoogle,
    disconnectGoogle,
    loginWithGoogle,
    clearUnbanMessage,
    loginWithPasskey,
    registerPasskey,
    deactivateAccount,
  };
}
