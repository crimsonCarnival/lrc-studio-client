import { useState, useEffect } from 'react';

/**
 * Hook for reading CSS safe area insets (notch, home indicator on iPhones/Android)
 * Returns an object with pixel values for each safe area inset
 * Listens to orientationchange and resize events to recalculate on device changes
 *
 * @returns {{top: number, right: number, bottom: number, left: number}} Safe area insets in pixels
 */
export default function useSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  // Helper function to read CSS environment variables
  const calculateSafeArea = () => {
    try {
      const style = getComputedStyle(document.documentElement);

      // Read CSS environment variables for safe area insets
      const top = parseFloat(style.getPropertyValue('--safe-area-inset-top') || style.getPropertyValue('env(safe-area-inset-top)') || '0');
      const right = parseFloat(style.getPropertyValue('--safe-area-inset-right') || style.getPropertyValue('env(safe-area-inset-right)') || '0');
      const bottom = parseFloat(style.getPropertyValue('--safe-area-inset-bottom') || style.getPropertyValue('env(safe-area-inset-bottom)') || '0');
      const left = parseFloat(style.getPropertyValue('--safe-area-inset-left') || style.getPropertyValue('env(safe-area-inset-left)') || '0');

      return {
        top: Math.max(0, isNaN(top) ? 0 : top),
        right: Math.max(0, isNaN(right) ? 0 : right),
        bottom: Math.max(0, isNaN(bottom) ? 0 : bottom),
        left: Math.max(0, isNaN(left) ? 0 : left),
      };
    } catch (error) {
      // Return zeros if there's any error reading the values
      return {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      };
    }
  };

  useEffect(() => {
    // Set initial safe area values
    setSafeArea(calculateSafeArea());

    // Handle orientation and resize changes
    const handleChange = () => {
      setSafeArea(calculateSafeArea());
    };

    // Listen to orientation change event
    window.addEventListener('orientationchange', handleChange);

    // Also listen to resize event as a fallback
    window.addEventListener('resize', handleChange);

    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener('orientationchange', handleChange);
      window.removeEventListener('resize', handleChange);
    };
  }, []);

  return safeArea;
}
