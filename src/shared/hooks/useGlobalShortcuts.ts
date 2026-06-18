import { useEffect } from 'react';
import type { Dispatch, SetStateAction, RefObject } from 'react';
import { matchKey } from '@/shared/utils/keyboard';
import type { AppSettings } from '@/features/settings/settings.types';

interface ShortcutPlayerHandle {
  togglePlay?: () => void;
  getCurrentTime?: () => number;
  seek?: (time: number) => void;
  adjustSpeed?: (delta: number) => void;
}

interface GlobalShortcutsOptions {
  undo: () => void;
  redo: () => void;
  setShowKeyboardHelp: Dispatch<SetStateAction<boolean>>;
  handleManualSave: () => void;
  settings: AppSettings;
  updateSetting: (path: string, value: unknown) => void;
  playerRef: RefObject<ShortcutPlayerHandle | null>;
}

/**
 * Registers global keyboard shortcuts for undo/redo, player controls, and help.
 */
export function useGlobalShortcuts({
  undo,
  redo,
  setShowKeyboardHelp,
  handleManualSave,
  settings,
  updateSetting,
  playerRef,
}: GlobalShortcutsOptions) {
  // ——— App + player shortcuts ———
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (matchKey(e, settings.shortcuts?.showHelp?.[0] || '?')) {
        setShowKeyboardHelp((prev) => !prev);
        // ——— Player shortcuts ———
      } else if (matchKey(e, settings.shortcuts?.playPause?.[0] || 'Enter')) {
        e.preventDefault();
        playerRef.current?.togglePlay?.();
      } else if (matchKey(e, settings.shortcuts?.seekBackward?.[0] || 'ArrowLeft')) {
        e.preventDefault();
        const cur = playerRef.current?.getCurrentTime?.() ?? 0;
        playerRef.current?.seek?.(Math.max(0, cur - (settings.playback?.seekTime ?? 5)));
      } else if (matchKey(e, settings.shortcuts?.seekForward?.[0] || 'ArrowRight')) {
        e.preventDefault();
        const cur = playerRef.current?.getCurrentTime?.() ?? 0;
        playerRef.current?.seek?.(cur + (settings.playback?.seekTime ?? 5));
      } else if (matchKey(e, settings.shortcuts?.mute?.[0] || 'm')) {
        e.preventDefault();
        updateSetting('playback.muted', !settings.playback?.muted);
      } else if (matchKey(e, settings.shortcuts?.speedUp?.[0] || '+')) {
        e.preventDefault();
        playerRef.current?.adjustSpeed?.(settings.editor?.nudge?.default ?? 0.1);
      } else if (matchKey(e, settings.shortcuts?.speedDown?.[0] || '-')) {
        e.preventDefault();
        playerRef.current?.adjustSpeed?.(-(settings.editor?.nudge?.default ?? 0.1));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, settings, updateSetting, playerRef, setShowKeyboardHelp]);

  // ——— Block disruptive browser shortcuts + Ctrl+S → manual save ———
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      // Ctrl+S → manual save instead of browser save dialog
      if (key === 's' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleManualSave();
        return;
      }
      // Block: bookmark (D), history (H), downloads (J), print (P), view-source (U)
      if (!e.shiftKey && !e.altKey && ['d', 'h', 'j', 'p', 'u'].includes(key)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleManualSave]);
}
