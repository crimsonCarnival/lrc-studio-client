import { useState, useEffect } from 'react';

type InputMethod = 'touch' | 'mouse' | 'hybrid' | 'unknown';

function detectFromQueries(hoverQuery: MediaQueryList, coarseQuery: MediaQueryList): InputMethod {
  if (coarseQuery.matches && !hoverQuery.matches) return 'touch';
  if (hoverQuery.matches && !coarseQuery.matches) return 'mouse';
  if (hoverQuery.matches && coarseQuery.matches) return 'hybrid';
  return 'unknown';
}

export default function useInputMethod(): InputMethod {
  const [inputMethod, setInputMethod] = useState<InputMethod>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return 'unknown';
    return detectFromQueries(
      window.matchMedia('(hover: hover)'),
      window.matchMedia('(pointer: coarse)')
    );
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const hoverQuery = window.matchMedia('(hover: hover)');
    const coarsePointerQuery = window.matchMedia('(pointer: coarse)');

    const handleChange = () => setInputMethod(detectFromQueries(hoverQuery, coarsePointerQuery));
    const handleOrientationChange = () => setInputMethod(detectFromQueries(hoverQuery, coarsePointerQuery));

    hoverQuery.addEventListener('change', handleChange);
    coarsePointerQuery.addEventListener('change', handleChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      hoverQuery.removeEventListener('change', handleChange);
      coarsePointerQuery.removeEventListener('change', handleChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return inputMethod;
}
