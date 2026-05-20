import { useCallback } from 'react';
import { getHapticPattern } from '../utils/hapticPatterns';

/**
 * Hook for triggering haptic feedback (vibration) on supported devices
 * Gracefully degrades on devices without vibration API support
 * @returns {Object} Object with trigger function
 */
export default function useHapticFeedback() {
  const trigger = useCallback((intensity = 'light') => {
    // Check if navigator.vibrate is available
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      const pattern = getHapticPattern(intensity);
      navigator.vibrate(pattern);
    }
  }, []);

  return { trigger };
}
