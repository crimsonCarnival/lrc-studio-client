import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/utils/utils';

interface LogoLoaderProps {
  /** Height of the bars in px. */
  size?: number;
  className?: string;
}

/**
 * App-wide indeterminate loading indicator: equalizer bars (redesign sheet 08).
 * Use it for every "working, no known end" state instead of a spinner.
 *
 * The name is historical: it used to animate the logo. Bars take `currentColor`, iris by
 * default, so `className="text-…"` recolours them.
 */
export function LogoLoader({ size = 16, className }: LogoLoaderProps) {
  const { t } = useTranslation();
  // Small sizes sit inside buttons and pills, where five bars would be a smudge.
  const bars = size < 24 ? 3 : 5;
  const barWidth = Math.max(2, Math.round(size / 7));
  const gap = Math.max(1, Math.round(size / 9));
  return (
    <span
      role="status"
      aria-label={t('common.loading')}
      className={cn('eq-bars shrink-0 align-middle text-iris', className)}
      style={{ '--eq-h': `${size}px`, '--eq-w': `${barWidth}px`, '--eq-gap': `${gap}px` } as CSSProperties}
    >
      {Array.from({ length: bars }, (_, i) => <i key={i} />)}
    </span>
  );
}
