import { useCallback } from 'react';
import {
  ANIMATION_TIMINGS,
  SPRING_CONFIG,
  getAnimationDuration,
} from '../utils/animationConfig';

interface GestureData {
  distance?: number;
  duration?: number;
  springType?: string;
}

/**
 * Hook providing gesture-aware animation configuration.
 * Animation duration matches gesture speed for natural, responsive feel.
 */
export default function useMobileAnimation() {
  const getAnimationConfig = useCallback((gestureData: GestureData = {}) => {
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
