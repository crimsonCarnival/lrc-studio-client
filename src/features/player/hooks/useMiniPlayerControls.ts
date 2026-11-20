import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { matchKey } from '@/shared/utils/keyboard';
import { isSwipeAway, nearestCorner, type MiniPlayerPosition } from '../mini-player';

type Shortcuts = Record<string, string[] | undefined> | undefined;

/**
 * The player keys while browsing with the mini player open: play/pause, seek, loop line, and
 * previous/next line unless those are on the arrow keys that scroll the page. Focused
 * controls, fields and dialogs keep their keys.
 */
export function useMiniPlayerShortcuts(shortcuts: Shortcuts, seekStep: number, actions: {
  togglePlay: () => void;
  seekBy: (delta: number) => void;
  previousLine: () => void;
  nextLine: () => void;
  toggleLoop: () => void;
}) {
  const ref = useRef(actions);
  useEffect(() => { ref.current = actions; });
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return;
      if (target.closest('[role="dialog"], [role="menu"], [role="listbox"]')) return;
      if (target.closest('button, a, [role="slider"], [role="tab"], [role="menuitem"]') && (e.key === ' ' || e.key === 'Enter' || e.key.startsWith('Arrow'))) return;
      const key = (name: string, fallback: string) => shortcuts?.[name]?.[0] || fallback;
      const pageArrow = (k: string) => k === 'ArrowUp' || k === 'ArrowDown';
      const run = (fn: () => void) => { e.preventDefault(); fn(); };
      const a = ref.current;
      if (matchKey(e, key('playPause', 'Space'))) run(a.togglePlay);
      else if (matchKey(e, key('seekBackward', 'ArrowLeft'))) run(() => a.seekBy(-seekStep));
      else if (matchKey(e, key('seekForward', 'ArrowRight'))) run(() => a.seekBy(seekStep));
      else if (matchKey(e, key('loopLine', 'l'))) run(a.toggleLoop);
      else if (!pageArrow(key('prevLine', 'ArrowUp')) && matchKey(e, key('prevLine', 'ArrowUp'))) run(a.previousLine);
      else if (!pageArrow(key('nextLine', 'ArrowDown')) && matchKey(e, key('nextLine', 'ArrowDown'))) run(a.nextLine);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcuts, seekStep]);
}

/**
 * The OS media controls (lock screen, notification, headphone and keyboard media keys): the
 * song, its artwork and position, with play/pause, seek and previous/next line.
 */
export function useMediaSession(info: { title: string; artist?: string; artwork: string | null; isPlaying: boolean; currentTime: number; duration: number }, actions: {
  play: () => void;
  pause: () => void;
  seekTo: (time: number) => void;
  previousLine: () => void;
  nextLine: () => void;
}) {
  const session = typeof navigator !== 'undefined' && 'mediaSession' in navigator ? navigator.mediaSession : null;
  const ref = useRef(actions);
  useEffect(() => { ref.current = actions; });

  useEffect(() => {
    if (!session || typeof MediaMetadata === 'undefined') return;
    session.metadata = new MediaMetadata({
      title: info.title,
      artist: info.artist ?? '',
      artwork: info.artwork ? [{ src: info.artwork }] : [],
    });
  }, [session, info.title, info.artist, info.artwork]);

  useEffect(() => {
    if (!session) return;
    session.playbackState = info.isPlaying ? 'playing' : 'paused';
  }, [session, info.isPlaying]);

  // Whole seconds: the lock screen does not need every tick.
  const second = Math.floor(info.currentTime);
  useEffect(() => {
    if (!session?.setPositionState || !(info.duration > 0)) return;
    try {
      session.setPositionState({ duration: info.duration, position: Math.min(second, info.duration), playbackRate: 1 });
    } catch {
      // A position past a stale duration throws; the next tick corrects it.
    }
  }, [session, second, info.duration]);

  useEffect(() => {
    if (!session) return;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => ref.current.play()],
      ['pause', () => ref.current.pause()],
      ['seekto', (d) => { if (d.seekTime != null) ref.current.seekTo(d.seekTime); }],
      ['previoustrack', () => ref.current.previousLine()],
      ['nexttrack', () => ref.current.nextLine()],
    ];
    for (const [action, handler] of handlers) {
      try { session.setActionHandler(action, handler); } catch { /* not supported here */ }
    }
    return () => {
      for (const [action] of handlers) {
        try { session.setActionHandler(action, null); } catch { /* not supported here */ }
      }
      session.metadata = null;
      session.playbackState = 'none';
    };
  }, [session]);
}

const DRAG_THRESHOLD = 6;

/**
 * Drag the card anywhere; on release it snaps to the nearest corner. On a phone, flinging it
 * sideways off the screen dismisses it. A press that moved past the threshold is a drag, so
 * the click that follows it is swallowed. Elements marked `data-no-drag` never start one.
 */
export function useCornerDrag({ onCorner, onSwipeAway, swipeEnabled }: {
  onCorner: (corner: MiniPlayerPosition) => void;
  onSwipeAway: () => void;
  swipeEnabled: boolean;
}) {
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const dragged = useRef(false);

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('[data-no-drag]')) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    dragged.current = false;
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const x = e.clientX - s.x;
    const y = e.clientY - s.y;
    if (!dragged.current && Math.hypot(x, y) < DRAG_THRESHOLD) return;
    if (!dragged.current) {
      dragged.current = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    setOffset({ x, y });
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    const s = start.current;
    start.current = null;
    if (!s || !dragged.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    setOffset(null);
    if (swipeEnabled && isSwipeAway(r.left, r.right, window.innerWidth)) onSwipeAway();
    else onCorner(nearestCorner(r.left + r.width / 2, r.top + r.height / 2, window.innerWidth, window.innerHeight));
  };
  const onPointerCancel = () => { start.current = null; setOffset(null); };
  // Capture phase, so the drag's closing click never reaches a button inside the card.
  const onClickCapture = (e: React.MouseEvent) => {
    if (!dragged.current) return;
    dragged.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  return {
    dragging: offset !== null,
    style: offset ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : undefined,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture },
  };
}
