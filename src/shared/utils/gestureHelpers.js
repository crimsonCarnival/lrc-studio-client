/**
 * Gesture detection constants and configuration
 */

export const GESTURE_CONFIG = {
  swipe: {
    threshold: 60, // pixels
    axis: 'x', // 'x' for horizontal, 'y' for vertical, 'both' for any direction
  },
  longPress: {
    duration: 500, // milliseconds
    moveThreshold: 20, // pixels - max movement before canceling long-press
  },
  tap: {
    duration: 300, // milliseconds - max duration for a tap
  },
};

/**
 * Calculate the distance between two points
 * @param {number} x1 - Starting X coordinate
 * @param {number} y1 - Starting Y coordinate
 * @param {number} x2 - Ending X coordinate
 * @param {number} y2 - Ending Y coordinate
 * @returns {number} Distance in pixels
 */
export function calculateDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Determine swipe direction based on movement deltas
 * @param {number} deltaX - Change in X
 * @param {number} deltaY - Change in Y
 * @returns {string} Direction: 'left', 'right', 'up', 'down'
 */
export function getSwipeDirection(deltaX, deltaY) {
  const absDeltaX = Math.abs(deltaX);
  const absDeltaY = Math.abs(deltaY);

  if (absDeltaX > absDeltaY) {
    return deltaX > 0 ? 'right' : 'left';
  }
  return deltaY > 0 ? 'down' : 'up';
}

/**
 * Dispatch custom gesture event to element
 * @param {HTMLElement} element - Target element
 * @param {string} eventName - Event name (e.g., 'swipe', 'longPress', 'tap')
 * @param {object} detail - Event detail object
 */
export function dispatchGestureEvent(element, eventName, detail = {}) {
  if (!element) return;

  const event = new CustomEvent(eventName, {
    detail,
    bubbles: true,
    cancelable: true,
  });

  element.dispatchEvent(event);
}
