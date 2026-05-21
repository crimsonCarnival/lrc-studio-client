import { useState, useEffect } from 'react';

function calculateSafeArea() {
  try {
    const style = getComputedStyle(document.documentElement);
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
  } catch {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
}

export default function useSafeArea() {
  const [safeArea, setSafeArea] = useState(() => calculateSafeArea());

  useEffect(() => {
    const handleChange = () => setSafeArea(calculateSafeArea());
    window.addEventListener('orientationchange', handleChange);
    window.addEventListener('resize', handleChange);
    return () => {
      window.removeEventListener('orientationchange', handleChange);
      window.removeEventListener('resize', handleChange);
    };
  }, []);

  return safeArea;
}
