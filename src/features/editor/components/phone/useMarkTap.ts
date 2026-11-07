import { useRef } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';

/**
 * Handlers that make a button stamp on pointerdown (waiting for the click adds latency you
 * can hear) while keeping keyboard and assistive-tech activation working. Shared by the
 * Mark bar and the Focus view so both stamp exactly once per tap.
 *
 * The click that trails a stamping pointerdown is swallowed: any click on the same element
 * within TAP_CLICK_WINDOW_MS of it, whatever its `detail` (some browsers deliver a tap's
 * click with detail 0, which must not stamp twice). Keyboard Enter/Space fire keydown first,
 * which clears the pending tap, and they keep from reaching the editor's window shortcuts
 * (Enter is the default mark key), so one press cannot stamp twice. A click that arrives
 * later (assistive tech after a long press) is a new activation and marks. Clearing on
 * pointerup would not work: on touch pointerup fires before the click.
 */
const TAP_CLICK_WINDOW_MS = 1000;

export function useMarkTap(onMark: () => void, disabled: boolean) {
  const lastPointerMark = useRef<number | null>(null);
  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      // Browsers differ on whether a disabled button still gets pointer events, so check.
      // A second finger or a non-primary mouse button is not a tap either.
      if (disabled || !e.isPrimary || e.button !== 0) return;
      // No focus ring, no emulated mouse events, no text selection from a long press.
      e.preventDefault();
      lastPointerMark.current = Date.now();
      onMark();
    },
    // A cancelled pointer (the browser took it for a scroll or zoom) gets no click.
    onPointerCancel: () => { lastPointerMark.current = null; },
    onClick: () => {
      if (disabled) return;
      const tailOfTap = lastPointerMark.current != null && Date.now() - lastPointerMark.current < TAP_CLICK_WINDOW_MS;
      lastPointerMark.current = null;
      if (!tailOfTap) onMark();
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      lastPointerMark.current = null;
      if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
    },
    onContextMenu: (e: MouseEvent<HTMLElement>) => e.preventDefault(),
  };
}
