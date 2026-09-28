import { useState, useEffect, type ComponentProps } from 'react';
import { ShineBorder } from '@/shared/ui/shine-border';

const THEME_COLORS = {
  dark:           ['#c4a7e7', '#c4a7e7', '#9ccfd8'],
  light:          ['#b4637a', '#b4637a', '#9ccfd8'],
};

type ThemeKey = keyof typeof THEME_COLORS;

function detectTheme(): ThemeKey {
  const cl = document.documentElement.classList;
  if (cl.contains('dark'))         return 'dark';
  return 'light';
}

type ThemedShineBorderProps = Omit<ComponentProps<typeof ShineBorder>, 'shineColor'>;

export function ThemedShineBorder({ borderWidth = 1.5, duration = 10, ...props }: ThemedShineBorderProps) {
  const [theme, setTheme] = useState<ThemeKey>(detectTheme);

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
