import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

/** Pixels one arrow-key press moves the edge (Shift moves it by the large step). */
export const RESIZE_KEY_STEP = 16;
export const RESIZE_KEY_STEP_LARGE = 64;

export interface ResizablePanelOptions {
  /** localStorage key the width is kept under: a per-browser layout choice, like the collapsed flags. */
  storageKey: string;
  defaultWidth: number;
  min: number;
  max: number;
  /** The edge of the panel the handle sits on: a right-hand panel is dragged by its left edge. */
  edge: 'left' | 'right';
}

export const clampWidth = (width: number, min: number, max: number): number =>
  Math.round(Math.min(max, Math.max(min, width)));

/** The width after the handle has moved `dx` px to the right. Dragging a left edge rightwards narrows the panel. */
export const resizedWidth = (start: number, dx: number, edge: 'left' | 'right', min: number, max: number): number =>
  clampWidth(start + (edge === 'left' ? -dx : dx), min, max);

function readWidth(key: string, fallback: number, min: number, max: number): number {
  try {
    const raw = localStorage.getItem(key);
    const n = raw == null ? NaN : Number(raw);
    return Number.isFinite(n) ? clampWidth(n, min, max) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Width of a docked side panel the user can drag, nudge with the arrow keys, or reset with a
 * double click. Spread `handleProps` on a `PanelResizeHandle`; apply `width` as an inline style.
 */
export function useResizablePanel({ storageKey, defaultWidth, min, max, edge }: ResizablePanelOptions) {
  const [width, setWidth] = useState(() => readWidth(storageKey, defaultWidth, min, max));
  const [dragging, setDragging] = useState(false);
  // What the key handler starts from; a drag keeps its own running value instead.
  const widthRef = useRef(width);
  useEffect(() => { widthRef.current = width; }, [width]);
  const stopRef = useRef<(() => void) | null>(null);

  const commit = useCallback((next: number) => {
    setWidth(next);
    try { localStorage.setItem(storageKey, String(next)); } catch { /* still applies for this session */ }
  }, [storageKey]);

  // A drag that outlives the panel (it was collapsed mid-drag) must not keep its listeners.
  useEffect(() => () => stopRef.current?.(), []);

  const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = widthRef.current;
    let latest = startWidth;
    const move = (ev: globalThis.PointerEvent) => {
      latest = resizedWidth(startWidth, ev.clientX - startX, edge, min, max);
      setWidth(latest);
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      stopRef.current = null;
      setDragging(false);
      commit(latest);
    };
    stopRef.current = stop;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    setDragging(true);
  }, [edge, min, max, commit]);

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLElement>) => {
    let next: number | null = null;
    const step = e.shiftKey ? RESIZE_KEY_STEP_LARGE : RESIZE_KEY_STEP;
    if (e.key === 'ArrowLeft') next = resizedWidth(widthRef.current, -step, edge, min, max);
    else if (e.key === 'ArrowRight') next = resizedWidth(widthRef.current, step, edge, min, max);
    else if (e.key === 'Home') next = min;
    else if (e.key === 'End') next = max;
    if (next == null) return;
    e.preventDefault();
    // The editor's own arrow shortcuts (seek, nudge) must not also fire.
    e.stopPropagation();
    commit(next);
  }, [edge, min, max, commit]);

  const onDoubleClick = useCallback(() => commit(clampWidth(defaultWidth, min, max)), [commit, defaultWidth, min, max]);

  return {
    width,
    dragging,
    handleProps: { onPointerDown, onKeyDown, onDoubleClick, edge, value: width, min, max, dragging },
  };
}
