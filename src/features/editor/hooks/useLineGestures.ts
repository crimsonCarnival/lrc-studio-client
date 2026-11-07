import { useRef, useCallback, useEffect } from 'react';
import type { TouchEvent as ReactTouchEvent } from 'react';
import type { AppSettings } from '@/features/settings/settings.types';

interface LineGesturesOptions {
  lineIndex: number;
  isSynced: boolean;
  settings: AppSettings;
  handleToggleLine: (lineIndex: number) => void;
  shiftTime: (lineIndex: number, delta: number) => void;
  showNudge: (delta: number) => void;
  /** Phone rows: a long press opens the line's sheet instead of toggling the selection. */
  onLongPress?: () => void;
}

export function useLineGestures({ lineIndex, isSynced, settings, handleToggleLine, shiftTime, showNudge, onLongPress }: LineGesturesOptions) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const firedRef = useRef(false);

  const handleTouchStart = useCallback((e: ReactTouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    firedRef.current = false;

    // Long-press → select (500ms)
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      firedRef.current = true;
      if (onLongPress) onLongPress();
      else handleToggleLine(lineIndex);
      touchStartRef.current = null; // cancel swipe
    }, 500);
  }, [handleToggleLine, lineIndex, onLongPress]);

  const handleTouchEnd = useCallback((e: ReactTouchEvent) => {
    clearTimeout(longPressTimerRef.current);
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    // Only register horizontal swipe: |dx| > 40px, |dy| < 30px, < 500ms
    if (Math.abs(dx) > 40 && Math.abs(dy) < 30 && elapsed < 500 && isSynced) {
      const nudge = settings.editor?.nudge?.default || 0.1;
      const delta = dx > 0 ? nudge : -nudge;
      shiftTime(lineIndex, delta);
      showNudge(delta);
    }
  }, [isSynced, settings.editor?.nudge?.default, shiftTime, showNudge, lineIndex]);

  const handleTouchMove = useCallback((e: ReactTouchEvent) => {
    // A finger always drifts a little while it holds still; only a real move (a scroll or a
    // swipe) cancels the long press.
    const start = touchStartRef.current;
    const touch = e.touches[0];
    if (start && touch && Math.hypot(touch.clientX - start.x, touch.clientY - start.y) < 10) return;
    clearTimeout(longPressTimerRef.current);
  }, []);

  const handleTouchCancel = useCallback(() => {
    clearTimeout(longPressTimerRef.current);
    touchStartRef.current = null;
  }, []);

  /** True once, right after a long press fired: the click that follows its release is not a tap. */
  const consumeLongPress = useCallback(() => {
    const fired = firedRef.current;
    firedRef.current = false;
    return fired;
  }, []);

  // Cleanup: only clear longPressTimerRef (nudgeTimerRef and wordClickTimerRef stay in EditorLineItem)
  useEffect(() => () => {
    clearTimeout(longPressTimerRef.current);
  }, []);

  return { handleTouchStart, handleTouchEnd, handleTouchMove, handleTouchCancel, consumeLongPress };
}
