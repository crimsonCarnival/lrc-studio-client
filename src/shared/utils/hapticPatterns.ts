/**
 * Haptic vibration patterns for tactile feedback
 */

const HAPTIC_PATTERNS = {
  light: 10,
  medium: [50, 50],
  heavy: 100,
};

/**
 * Get haptic vibration pattern for a given intensity
 * @param {string} intensity - 'light', 'medium', or 'heavy'
 * @returns {number|number[]} - Vibration pattern compatible with navigator.vibrate()
 */
export function getHapticPattern(intensity) {
  const pattern = HAPTIC_PATTERNS[intensity];

  // Default to light pattern if intensity is unknown
  if (pattern === undefined) {
    return HAPTIC_PATTERNS.light;
  }

  return pattern;
}
