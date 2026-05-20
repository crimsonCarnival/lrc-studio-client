import { useState, useEffect } from 'react';

/**
 * Hook for detecting device input method capability
 * Detects whether device supports hover (mouse) or is touch-only
 *
 * @returns {string} 'touch', 'mouse', 'hybrid', or 'unknown'
 */
export default function useInputMethod() {
  const [inputMethod, setInputMethod] = useState('unknown');

  useEffect(() => {
    // Check if media queries are supported
    if (!window.matchMedia) {
      setInputMethod('unknown');
      return;
    }

    // Media query checks
    const hoverQuery = window.matchMedia('(hover: hover)');
    const coarsePointerQuery = window.matchMedia('(pointer: coarse)');

    // Determine input method based on media query results
    const detectInputMethod = () => {
      const supportsHover = hoverQuery.matches;
      const supportsCoarsePointer = coarsePointerQuery.matches;

      if (supportsCoarsePointer && !supportsHover) {
        return 'touch';
      } else if (supportsHover && !supportsCoarsePointer) {
        return 'mouse';
      } else if (supportsHover && supportsCoarsePointer) {
        return 'hybrid';
      }
      return 'unknown';
    };

    // Initial detection
    setInputMethod(detectInputMethod());

    // Handle orientation change
    const handleOrientationChange = () => {
      setInputMethod(detectInputMethod());
    };

    // Handle device connection changes (e.g., keyboard/mouse connected)
    const handleChange = () => {
      setInputMethod(detectInputMethod());
    };

    // Listen to media query changes
    hoverQuery.addEventListener('change', handleChange);
    coarsePointerQuery.addEventListener('change', handleChange);

    // Listen to orientation change
    window.addEventListener('orientationchange', handleOrientationChange);

    // Cleanup listeners on unmount
    return () => {
      hoverQuery.removeEventListener('change', handleChange);
      coarsePointerQuery.removeEventListener('change', handleChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return inputMethod;
}
