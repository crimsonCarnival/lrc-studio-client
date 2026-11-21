import { useEffect, useRef } from 'react';
import { usePlayer } from '@features/player/PlayerContext';
import { useSettings } from '@/features/settings/useSettings';
import { miniPlayerSettings, ownsPlayer, type ViewSnapshot } from '@features/player/mini-player';
import { publishHandoff } from '@features/player/mini-handoff';

type Props = Omit<ViewSnapshot, 'time' | 'playing'>;

/**
 * Hands the view's playback to the mini player when the view is left for a page that does not
 * play anything itself. Renders nothing; sits inside the view's PlayerEngineProvider so it can
 * read the position at the moment of leaving.
 */
export default function MiniPlayerHandoff(props: Props) {
  const { currentTime, isPlaying, hasMedia } = usePlayer();
  const { settings } = useSettings();
  const latest = useRef({ props, currentTime, isPlaying, hasMedia, enabled: true });
  useEffect(() => {
    latest.current = { props, currentTime, isPlaying, hasMedia, enabled: miniPlayerSettings(settings.interface as Record<string, unknown> | undefined).enabled };
  });

  useEffect(() => () => {
    const { props: p, currentTime: time, isPlaying: playing, hasMedia: loaded, enabled } = latest.current;
    // The router has already moved on when this runs, so the URL is where the user went.
    if (!enabled || !loaded || ownsPlayer(window.location.pathname)) return;
    publishHandoff({ ...p, time, playing });
  }, []);

  return null;
}
