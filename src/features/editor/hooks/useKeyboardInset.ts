import { useEffect, useState } from 'react';

// Below this the gap is browser chrome (a collapsing address bar), not a keyboard.
const KEYBOARD_MIN_PX = 100;

/**
 * Height of the on-screen keyboard (the part of the layout viewport the visual viewport no
 * longer covers), or 0. Browsers shrink only the visual viewport when a keyboard opens, so a
 * footer that sits at the bottom of the page ends up under it; padding the screen by this
 * amount lifts the footer above the keyboard.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;
    const update = () => {
      const hidden = window.innerHeight - vv.height - vv.offsetTop;
      setInset(hidden >= KEYBOARD_MIN_PX ? Math.round(hidden) : 0);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  return inset;
}
