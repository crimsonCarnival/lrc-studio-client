import { useState, useEffect, useCallback, useRef } from 'react';
import { auth, spotify as spotifyApi, google as googleApi, setAuthFlag } from '@/app/api';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

// Real server origin (not the Vite/Vercel proxy path) for OAuth postMessage validation
const API_ORIGIN = import.meta.env.VITE_SERVER_ORIGIN || window.location.origin;
import toast from 'react-hot-toast';
import { authEvents } from '@/shared/utils/auth-events';
import { STORAGE_KEYS, storage } from '@/features/projects/services/storage.service';

export function useAuth() {
  const [state, setState] = useState({ user: null, loading: true });
  const user = state.user;
  const loading = state.loading;
  const setUser = useCallback((u) => setState(s => ({ ...s, user: typeof u === 'function' ? u(state.user) : u })), [state.user]);
  
  const refreshTimerRef = useRef(null);
  const { executeRecaptcha } = useGoogleReCaptcha();

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
    setState({ user: null, loading: false });
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  // Schedule a token refresh before the access token expires (default: 14 min for 15 min expiry)
  const scheduleRefresh = useCallback((expiresIn = 14 * 60 * 1000) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        await auth.refresh();
        scheduleRefresh();
      } catch {
        // Refresh failed — session fully expired, force logout with feedback
        await doLogout();
        toast.error('Your session has expired. Please sign in again.', {
          id: 'session-expired',
          duration: 6000,
        });
      }
    }, expiresIn);
  }, [doLogout]);

  // Restore project on mount — guarded against StrictMode double-fire
  const restoringRef = useRef(false);
  useEffect(() => {
    if (restoringRef.current) return;
    restoringRef.current = true;

    const restore = async () => {
      // Skip the round-trip entirely when no session was previously established.
      // The httpOnly cookie is still the auth authority — this is only a hint to
      // avoid a guaranteed-null GraphQL request on cold load for guests.
      if (!storage.get(STORAGE_KEYS.HAS_SESSION)) {
        setState({ user: null, loading: false });
        return;
      }

      try {
        const user = await auth.me();
        storage.set(STORAGE_KEYS.HAS_SESSION, '1');
        setAuthFlag(true);
        setState({ user, loading: false });
        scheduleRefresh();
      } catch (err) {
        if (err?.status === 401) {
          // Access token might be expired, try refreshing
          try {
            await auth.refresh();
            const user = await auth.me();
            storage.set(STORAGE_KEYS.HAS_SESSION, '1');
            setAuthFlag(true);
            setState({ user, loading: false });
            scheduleRefresh();
          } catch {
            // Both tokens invalid or missing
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
  }, [scheduleRefresh]);

  // ——— Global token-expiry handler ———
  const isRefreshingRef = useRef(false);
  useEffect(() => {
    const unsub = authEvents.on('token:expired', async () => {
      if (isRefreshingRef.current) return; // de-duplicate concurrent events
      isRefreshingRef.current = true;
      try {
        await auth.refresh();
        scheduleRefresh();
      } catch {
        // Both tokens are dead — force logout
        await doLogout();
        toast.error('Your session has expired. Please sign in again.', {
          id: 'session-expired',
          duration: 6000,
        });
        window.location.href = '/auth?action=signin&from=session-expiration';
      } finally {
        isRefreshingRef.current = false;
      }
    });
    return unsub;
  }, [doLogout, scheduleRefresh]);

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

  const register = useCallback(async ({ username, email, password }) => {
    let recaptchaToken = undefined;
    if (executeRecaptcha) {
      recaptchaToken = await executeRecaptcha('register');
    }

    const result = await auth.register({ username, email, password, recaptchaToken });
    // Cookies are automatically set by the server. Just update user state.
    storage.set(STORAGE_KEYS.HAS_SESSION, '1');
    setAuthFlag(true);
    setState({ user: result.user, loading: false });
    scheduleRefresh();

    // Handle post-auth continuation (e.g., after cloning a project)
    handlePostAuthClone();

    return result;
  }, [scheduleRefresh, executeRecaptcha, handlePostAuthClone]);

  // ——— Spotify connect / disconnect ———

  const connectSpotify = useCallback(async () => {
    // Open synchronously so browsers don't block it as a non-gesture popup
    const width = 500, height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open('about:blank', 'spotify-auth', `width=${width},height=${height},left=${left},top=${top}`);
    const { url } = await spotifyApi.getAuthUrl();
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

  const loginWithGoogle = useCallback(async () => {
    const width = 500, height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    // Open synchronously so browsers don't block it as a non-gesture popup
    const popup = window.open('about:blank', 'google-login', `width=${width},height=${height},left=${left},top=${top}`);
    const url = await googleApi.getLoginUrl();
    if (popup) { popup.location.href = url; } else { window.open(url, 'google-login', `width=${width},height=${height},left=${left},top=${top}`); }
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

  return {
    user,
    setUser,
    loading,
    login,
    register,
    logout: doLogout,
    connectSpotify,
    disconnectSpotify,
    connectGoogle,
    disconnectGoogle,
    loginWithGoogle,
    clearUnbanMessage,
  };
}
