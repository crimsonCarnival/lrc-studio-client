import { useCallback } from 'react';
import { getHapticPattern } from '../utils/hapticPatterns';

/**
 * Hook for triggering haptic feedback (vibration) on supported devices.
 * Gracefully degrades on devices without vibration API support.
 */
export default function useHapticFeedback() {
  const trigger = useCallback((intensity: string = 'light') => {
    // Check if navigator.vibrate is available
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      const pattern = getHapticPattern(intensity);
      navigator.vibrate(pattern);
    }
  }, []);

  return { trigger };
}
