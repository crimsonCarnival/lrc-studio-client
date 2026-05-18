import { useState, useEffect } from 'react';
import { ShineBorder } from '@/shared/ui/shine-border';

const THEME_COLORS = {
  'theme-cobalt': ['#2F2FE4', '#6060F0', '#4F9FFF'],
  'theme-velvet': ['#A64D79', '#7B3F9E', '#4F7FFF'],
  'theme-sage':   ['#5C8374', '#7B7FBF', '#4F8FAF'],
  dark:           ['#c4a7e7', '#c4a7e7', '#9ccfd8'],
  light:          ['#b4637a', '#b4637a', '#9ccfd8'],
};

function detectTheme() {
  const cl = document.documentElement.classList;
  if (cl.contains('theme-cobalt')) return 'theme-cobalt';
  if (cl.contains('theme-velvet')) return 'theme-velvet';
  if (cl.contains('theme-sage'))   return 'theme-sage';
  if (cl.contains('dark'))         return 'dark';
  return 'light';
}

export function ThemedShineBorder({ borderWidth = 1.5, duration = 10, ...props }) {
  const [theme, setTheme] = useState(detectTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(detectTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <ShineBorder
      shineColor={THEME_COLORS[theme]}
      borderWidth={borderWidth}
      duration={duration}
      {...props}
    />
  );
}
