import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DragonflyLoader } from './DragonflyLoader';

// Render's free tier spins the server down when idle, so the very first
// request after a while can take up to ~50s to get a cold instance back up.
// A bare spinner for that long reads as broken, so after a delay we tell the
// visitor what's actually happening instead of leaving them guessing.
const WAKE_MESSAGE_DELAY_MS = 4000;

/**
 * Full-screen loading gate shown before the app has anything else to render
 * (auth restore, route chunk load). Not used for in-app loading states —
 * those stay on LogoLoader. It starts as the hovering dragonfly at ROUTE_LOADER_SIZE, the same
 * loader as the route-level fallbacks in AppRouter — the gate hands off to them, and a
 * different size reads as a loader that shrinks mid-load. Once the wait is long enough to
 * explain (the server is waking), the dragonfly starts wandering instead.
 */
export const ROUTE_LOADER_SIZE = 48;
/** Sized so the flight path (about 4.6 times as wide) still fits a 360px phone. */
const WANDER_SIZE = 36;

export function AppLoadingScreen() {
  const { t } = useTranslation();
  const [showWakeMessage, setShowWakeMessage] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowWakeMessage(true), WAKE_MESSAGE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
      {showWakeMessage
        ? <DragonflyLoader variant="wander" size={WANDER_SIZE} />
        : <DragonflyLoader variant="hover" size={ROUTE_LOADER_SIZE} />}
      {showWakeMessage && (
        <p className="text-sm text-zinc-500 animate-fade-in px-4 text-center">
          {t('common.serverWakingUp')}
        </p>
      )}
    </div>
  );
}
