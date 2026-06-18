import { useState, useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

/**
 * Custom hook to make a modal draggable by its header.
 * Returns { position, handleMouseDown } where position is { x, y } offset
 * and handleMouseDown should be attached to the drag handle element.
 * Position resets when `isOpen` transitions to true.
 */
export default function useDraggable(isOpen: boolean) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const moveHandlerRef = useRef<((e: PointerEvent) => void) | null>(null);
  const upHandlerRef = useRef<(() => void) | null>(null);

  // Reset position when the modal opens
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      draggingRef.current = false;
      if (moveHandlerRef.current) {
        document.removeEventListener('pointermove', moveHandlerRef.current);
      }
      if (upHandlerRef.current) {
        document.removeEventListener('pointerup', upHandlerRef.current);
        document.removeEventListener('pointercancel', upHandlerRef.current);
      }
    };
  }, []);

  const handlePointerDown = useCallback((e: ReactPointerEvent) => {
    // Only respond to primary mouse or touch
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Don't start drag if the target is an interactive element
    if ((e.target as Element).closest('button, input, select, textarea, a')) return;

    if (e.pointerType === 'mouse') {
      e.preventDefault();
    }

    draggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = moveEvent.clientX - lastMouseRef.current.x;
      const dy = moveEvent.clientY - lastMouseRef.current.y;

      lastMouseRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };

      setPosition((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
    };

    const handlePointerUp = () => {
      draggingRef.current = false;
      if (moveHandlerRef.current) document.removeEventListener('pointermove', moveHandlerRef.current);
      if (upHandlerRef.current) {
        document.removeEventListener('pointerup', upHandlerRef.current);
        document.removeEventListener('pointercancel', upHandlerRef.current);
      }
      moveHandlerRef.current = null;
      upHandlerRef.current = null;
    };

    moveHandlerRef.current = handlePointerMove;
    upHandlerRef.current = handlePointerUp;

    document.addEventListener('pointermove', moveHandlerRef.current);
    document.addEventListener('pointerup', upHandlerRef.current);
    document.addEventListener('pointercancel', upHandlerRef.current);
  }, []);

  return { position, handleMouseDown: handlePointerDown };
}
