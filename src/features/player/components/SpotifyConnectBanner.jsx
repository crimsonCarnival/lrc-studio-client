import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import SpotifyIcon from './SpotifyIcon';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

/**
 * Dismissable app-wide banner nudging signed-in users to connect Spotify.
 *
 * Mounted once in the app shell (AppLayout), so the `dismissed` state persists
 * across route changes but resets on a full page reload — i.e. dismissed for
 * the session, reappears on refresh. Hidden in the project workspace and on the
 * guest landing so it never blocks the editor.
 */
export function SpotifyConnectBanner() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, connectSpotify } = useAuthContext();
  const reducedMotion = useReducedMotion();
  const [dismissed, setDismissed] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const inWorkspace = location.pathname.startsWith('/project/');
  const isLanding = location.pathname === '/';
  const isAdmin = location.pathname.startsWith('/admin');

  const shouldShow =
    !!user && !user.isGuest && !user.spotify?.spotifyId &&
    !dismissed && !inWorkspace && !isLanding && !isAdmin;

  const handleConnect = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      await connectSpotify();
    } catch (err) {
      if (err?.message !== 'Spotify auth popup was closed') {
        const { default: toast } = await import('react-hot-toast');
        toast.error(t('settings.spotify.connectFailed') || 'Failed to connect Spotify');
      }
    } finally {
      setConnecting(false);
    }
  }, [connecting, connectSpotify, t]);

  if (!shouldShow) return null;

  return (
    <div
      role="region"
      aria-label="Spotify"
      className={`shrink-0 flex items-center gap-3 px-3.5 py-2.5 mb-4 rounded-xl border border-green-500/20 bg-green-500/[0.07] contrast-more:border-green-500/50 ${reducedMotion ? '' : 'animate-fade-in'}`}
    >
      <div className="size-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
        <SpotifyIcon className="size-4 text-green-500" />
      </div>
      <p className="flex-1 min-w-0 text-xs sm:text-[13px] text-zinc-300 contrast-more:text-zinc-100 leading-snug">
        {t('spotify.bannerText')}
      </p>
      <button
        type="button"
        onClick={handleConnect}
        disabled={connecting}
        className="shrink-0 h-8 px-4 rounded-lg bg-green-500 hover:bg-green-400 text-zinc-950 text-xs font-bold transition-colors disabled:opacity-60"
      >
        {t('spotify.bannerCta')}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t('spotify.bannerDismiss')}
        className="shrink-0 size-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export default SpotifyConnectBanner;
