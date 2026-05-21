import { useRef, useCallback, useEffect } from 'react';
import {
  GESTURE_CONFIG,
  calculateDistance,
  getSwipeDirection,
  dispatchGestureEvent,
} from '../utils/gestureHelpers';

/**
 * Hook for detecting touch gestures (tap, swipe, long-press, pinch)
 * Returns touch event handlers that can be attached to DOM elements
 *
 * @returns {object} Object containing onTouchStart, onTouchMove, onTouchEnd handlers
 */
export default function useGestures() {
  const touchState = useRef({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startTime: 0,
    longPressTimer: null,
    isMoving: false,
    initialDistance: null,
  });

  // Clean up timer on component unmount
  useEffect(() => {
    return () => {
      if (touchState.current?.longPressTimer) {
        clearTimeout(touchState.current.longPressTimer);
      }
    };
  }, []);

  /**
   * Handle touch start
   */
  const onTouchStart = useCallback((event, element) => {
    if (event.touches.length === 0) return;

    const touch = event.touches[0];
    const now = Date.now();

    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      startTime: now,
      longPressTimer: null,
      isMoving: false,
      initialDistance: null,
    };

    // Set up long-press timer
    touchState.current.longPressTimer = setTimeout(() => {
      const { isMoving } = touchState.current;

      // Only trigger long-press if touch hasn't moved significantly
      if (!isMoving) {
        dispatchGestureEvent(element, 'longPress', {
          x: touch.clientX,
          y: touch.clientY,
          startTime: touchState.current.startTime,
        });
      }
    }, GESTURE_CONFIG.longPress.duration);

    event.preventDefault();
  }, []);

  /**
   * Handle touch move
   */
  const onTouchMove = useCallback((event, _element) => {
    if (event.touches.length === 0) return;

    const touch = event.touches[0];
    const { startX, startY, longPressTimer } = touchState.current;

    // Update current position
    touchState.current.currentX = touch.clientX;
    touchState.current.currentY = touch.clientY;

    // Calculate distance from start
    const distance = calculateDistance(
      startX,
      startY,
      touch.clientX,
      touch.clientY
    );

    // If movement exceeds threshold, cancel long-press
    if (distance > GESTURE_CONFIG.longPress.moveThreshold) {
      touchState.current.isMoving = true;

      if (longPressTimer) {
        clearTimeout(longPressTimer);
        touchState.current.longPressTimer = null;
      }
    }

    event.preventDefault();
  }, []);

  /**
   * Handle touch end
   */
  const onTouchEnd = useCallback((event, element) => {
    if (event.changedTouches.length === 0) return;

    const _touch = event.changedTouches[0];
    const {
      startX,
      startY,
      currentX,
      currentY,
      startTime,
      longPressTimer,
      isMoving,
    } = touchState.current;

    const now = Date.now();
    const duration = now - startTime;

    // Clear long-press timer if still active
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      touchState.current.longPressTimer = null;
    }

    // Calculate swipe metrics
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;
    const distance = calculateDistance(startX, startY, currentX, currentY);

    // Detect tap (brief touch with minimal movement)
    if (!isMoving && duration < GESTURE_CONFIG.tap.duration) {
      dispatchGestureEvent(element, 'tap', {
        x: currentX,
        y: currentY,
        duration,
      });
    }

    // Detect swipe (sufficient distance)
    if (distance >= GESTURE_CONFIG.swipe.threshold) {
      const direction = getSwipeDirection(deltaX, deltaY);

      dispatchGestureEvent(element, 'swipe', {
        distance,
        direction,
        deltaX,
        deltaY,
        duration,
        x: currentX,
        y: currentY,
      });
    }

    event.preventDefault();
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
