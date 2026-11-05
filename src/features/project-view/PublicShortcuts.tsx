import { useEffect } from 'react';
import { usePlayer } from '@features/player/PlayerContext';
import { useSettings } from '@/features/settings/useSettings';
import { matchKey } from '@/shared/utils/keyboard';

/**
 * Play/pause and seek keys for the public view's own player. The app-wide shortcuts
 * (useGlobalShortcuts) drive the editor's player, so they stand down on this route.
 */
export default function PublicShortcuts() {
  const { settings } = useSettings();
  const { togglePlay, seek, currentTime, hasMedia } = usePlayer();

  useEffect(() => {
    if (!hasMedia) return;
    const step = settings.playback?.seekTime ?? 5;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      // A focused button/slider already handles Space/arrows itself.
      if (target.closest('button, [role="slider"], a, [role="menuitem"]')) return;
      if (matchKey(e, settings.shortcuts?.playPause?.[0] || 'Space')) {
        e.preventDefault();
        togglePlay();
      } else if (matchKey(e, settings.shortcuts?.seekBackward?.[0] || 'ArrowLeft')) {
        e.preventDefault();
        seek(Math.max(0, currentTime - step));
      } else if (matchKey(e, settings.shortcuts?.seekForward?.[0] || 'ArrowRight')) {
        e.preventDefault();
        seek(currentTime + step);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [settings.shortcuts, settings.playback?.seekTime, togglePlay, seek, currentTime, hasMedia]);

  return null;
}
