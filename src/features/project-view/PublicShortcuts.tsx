import { useEffect } from 'react';
import { usePlayer } from '@features/player/PlayerContext';
import { useSettings } from '@/features/settings/useSettings';
import { useVisualizer } from '@features/visualizer/visualizer-context';
import { matchKey } from '@/shared/utils/keyboard';
import type { LyricsAlignment } from './lyrics-alignment';

interface PublicShortcutsProps {
  onAlign: (alignment: LyricsAlignment) => void;
  onToggleFullLyrics: () => void;
  /** Omit when there is no media, so the key cannot hide a bar it could not bring back. */
  onTogglePlayer?: () => void;
}

/**
 * Keys for the public view: its own player's play/pause and seek, plus the view's display
 * toggles. The app-wide shortcuts (useGlobalShortcuts) drive the editor's player, so they
 * stand down on this route; mute and the help dialog stay global. Must sit inside
 * VisualizerProvider.
 */
export default function PublicShortcuts({ onAlign, onToggleFullLyrics, onTogglePlayer }: PublicShortcutsProps) {
  const { settings } = useSettings();
  const { togglePlay, seek, currentTime, hasMedia } = usePlayer();
  const { toggleKind } = useVisualizer();

  useEffect(() => {
    const step = settings.playback?.seekTime ?? 5;
    const keys = settings.shortcuts;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      // An open dialog (the visualizer picker, the help) keeps its keys to itself.
      if (target.closest('[role="dialog"]')) return;
      // A focused button/slider already handles Space, Enter and the arrows itself.
      const nativeKey = e.key === ' ' || e.key === 'Enter' || e.key.startsWith('Arrow');
      if (nativeKey && target.closest('button, [role="slider"], a, [role="menuitem"]')) return;

      const run = (action: () => void) => { e.preventDefault(); action(); };
      if (hasMedia && matchKey(e, keys?.playPause?.[0] || 'Space')) run(togglePlay);
      else if (hasMedia && matchKey(e, keys?.seekBackward?.[0] || 'ArrowLeft')) run(() => seek(Math.max(0, currentTime - step)));
      else if (hasMedia && matchKey(e, keys?.seekForward?.[0] || 'ArrowRight')) run(() => seek(currentTime + step));
      else if (matchKey(e, keys?.alignLeft?.[0] || 'Shift+L')) run(() => onAlign('left'));
      else if (matchKey(e, keys?.alignCenter?.[0] || 'Shift+C')) run(() => onAlign('center'));
      else if (matchKey(e, keys?.alignRight?.[0] || 'Shift+R')) run(() => onAlign('right'));
      else if (matchKey(e, keys?.toggleFullLyrics?.[0] || 'l')) run(onToggleFullLyrics);
      else if (matchKey(e, keys?.toggleVisualizer?.[0] || 'v')) run(toggleKind);
      else if (onTogglePlayer && matchKey(e, keys?.togglePlayer?.[0] || 'p')) run(onTogglePlayer);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [settings.shortcuts, settings.playback?.seekTime, togglePlay, seek, currentTime, hasMedia, onAlign, onToggleFullLyrics, onTogglePlayer, toggleKind]);

  return null;
}
