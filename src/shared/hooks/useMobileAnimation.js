import { useCallback } from 'react';
import {
  ANIMATION_TIMINGS,
  SPRING_CONFIG,
  getAnimationDuration,
} from '../utils/animationConfig';

/**
 * Hook providing gesture-aware animation configuration
 * Animation duration matches gesture speed for natural, responsive feel
 *
 * @returns {object} Object containing:
 *   - getAnimationConfig: Function to get animation config for a gesture
 *   - SPRING_CONFIG: Available spring physics configurations
 *   - ANIMATION_TIMINGS: Predefined timing constants
 *
 * @example
 * const { getAnimationConfig, SPRING_CONFIG } = useMobileAnimation();
 *
 * // Use gesture data from useGestures
 * const config = getAnimationConfig({
 *   distance: 150,
 *   duration: 300,
 *   springType: 'SMOOTH',
 * });
 *
 * // Returns: { type: 'spring', stiffness: 100, ..., duration: 300 }
 */
export default function useMobileAnimation() {
  /**
   * Get animation configuration based on gesture data
   *
   * @param {object} gestureData - Gesture information
   * @param {number} gestureData.distance - Gesture distance in pixels (optional, default 0)
   * @param {number} gestureData.duration - Gesture duration in milliseconds (optional, default 0)
   * @param {string} gestureData.springType - Spring type key: 'BOUNCY', 'SMOOTH', 'SNAPPY' (optional, default 'SMOOTH')
   * @returns {object} Animation config with spring properties and duration
   */
  const getAnimationConfig = useCallback((gestureData = {}) => {
    const {
      distance = 0,
      duration = 0,
      springType = 'SMOOTH',
    } = gestureData;

    // Get base spring configuration
    const baseSpringConfig = SPRING_CONFIG[springType] || SPRING_CONFIG.SMOOTH;

    // Calculate animation duration based on gesture
    const animationDuration = getAnimationDuration(distance, duration);

    // Return spring config combined with calculated duration
    return {
      ...baseSpringConfig,
      duration: animationDuration,
    };
  }, []);

  return {
    getAnimationConfig,
    SPRING_CONFIG,
    ANIMATION_TIMINGS,
  };
}
