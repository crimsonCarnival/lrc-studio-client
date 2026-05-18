import { useEffect } from 'react';
import { matchKey } from '@/shared/utils/keyboard';

/**
 * Registers global keyboard shortcuts for undo/redo, player controls, and help.
 *
 * @param {object} opts
 * @param {Function} opts.undo
 * @param {Function} opts.redo
 * @param {Function} opts.setShowKeyboardHelp
 * @param {Function} opts.handleManualSave
 * @param {object}   opts.settings
 * @param {Function} opts.updateSetting
 * @param {object}   opts.playerRef
 */
export function useGlobalShortcuts({
  undo,
  redo,
  setShowKeyboardHelp,
  handleManualSave,
  settings,
  updateSetting,
  playerRef,
}) {
  // ——— App + player shortcuts ———
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
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
        updateSetting('playback.muted', !settings.playback.muted);
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
    const handler = (e) => {
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
