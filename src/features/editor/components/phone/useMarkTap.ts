import { useRef } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';

/**
 * Handlers that make a button stamp on pointerdown (waiting for the click adds latency you
 * can hear) while keeping keyboard and assistive-tech activation working. Shared by the
 * Mark bar and the Focus view so both stamp exactly once per tap.
 *
 * The click that trails a stamping pointerdown is swallowed. A click with detail 0 (keyboard
 * or assistive tech) always marks, even if a finger left the flag set, and Enter/Space keep
 * from reaching the editor's window shortcuts (Enter is the default mark key) so one press
 * cannot stamp twice. Clearing the flag on pointerup would not work: on touch pointerup
 * fires before the click, so that click would mark again.
 */
export function useMarkTap(onMark: () => void, disabled: boolean) {
  const markedOnPointer = useRef(false);
  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      // Browsers differ on whether a disabled button still gets pointer events, so check.
      // A second finger or a non-primary mouse button is not a tap either.
      if (disabled || !e.isPrimary || e.button !== 0) return;
      // No focus ring, no emulated mouse events, no text selection from a long press.
      e.preventDefault();
      markedOnPointer.current = true;
      onMark();
    },
    // A cancelled pointer (the browser took it for a scroll or zoom) gets no click.
    onPointerCancel: () => { markedOnPointer.current = false; },
    onClick: (e: MouseEvent<HTMLElement>) => {
      if (disabled) return;
      const tailOfTap = markedOnPointer.current && e.detail > 0;
      markedOnPointer.current = false;
      if (!tailOfTap) onMark();
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      markedOnPointer.current = false;
      if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
    },
    onContextMenu: (e: MouseEvent<HTMLElement>) => e.preventDefault(),
  };
}
