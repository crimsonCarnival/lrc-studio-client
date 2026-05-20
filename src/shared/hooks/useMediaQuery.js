import { useState, useEffect } from 'react';

/**
 * Hook for listening to CSS media query changes
 * Returns a boolean indicating if the media query matches
 *
 * @param {string} query - CSS media query string, e.g. '(min-width: 1024px)'
 * @returns {boolean} true if the media query matches, false otherwise
 */
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Check if matchMedia is supported
    if (!window.matchMedia) {
      return;
    }

    // Create media query list
    const mediaQueryList = window.matchMedia(query);

    // Set initial state
    setMatches(mediaQueryList.matches);

    // Handle media query changes
    const handleChange = (event) => {
      setMatches(event.matches);
    };

    // Listen to media query changes
    mediaQueryList.addEventListener('change', handleChange);

    // Cleanup listener on unmount
    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}
