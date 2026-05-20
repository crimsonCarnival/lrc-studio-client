/**
 * Animation configuration constants and utilities
 * Provides timing presets and spring physics configurations for smooth gestures
 */

/**
 * Predefined animation timing durations (milliseconds)
 */
export const ANIMATION_TIMINGS = {
  FAST: 150,
  NORMAL: 200,
  SLOW: 300,
};

/**
 * Spring physics configurations for different animation feels
 * Each config has: type, stiffness, damping, mass
 */
export const SPRING_CONFIG = {
  BOUNCY: {
    type: 'spring',
    stiffness: 200,
    damping: 10,
    mass: 1,
  },
  SMOOTH: {
    type: 'spring',
    stiffness: 100,
    damping: 20,
    mass: 1,
  },
  SNAPPY: {
    type: 'spring',
    stiffness: 300,
    damping: 25,
    mass: 1,
  },
};

/**
 * Calculate animation duration based on gesture data
 * If no gesture occurred, returns FAST timing (150ms)
 * If gesture occurred, uses gesture duration clamped to 100-500ms
 *
 * @param {number} distance - Gesture distance in pixels (0 if no gesture)
 * @param {number} duration - Gesture duration in milliseconds (0 if no gesture)
 * @returns {number} Duration in milliseconds for animation (100-500ms range)
 *
 * @example
 * // No gesture - returns FAST (150ms)
 * getAnimationDuration(0, 0) // 150
 *
 * // Fast swipe (300ms) - uses gesture duration
 * getAnimationDuration(100, 300) // 300
 *
 * // Very slow gesture (1000ms) - clamped to max
 * getAnimationDuration(50, 1000) // 500
 */
export function getAnimationDuration(distance = 0, duration = 0) {
  // If no gesture occurred, return FAST timing
  if (distance === 0 && duration === 0) {
    return ANIMATION_TIMINGS.FAST;
  }

  // Clamp gesture duration to 100-500ms range
  const MIN_DURATION = 100;
  const MAX_DURATION = 500;

  return Math.max(MIN_DURATION, Math.min(MAX_DURATION, duration));
}
