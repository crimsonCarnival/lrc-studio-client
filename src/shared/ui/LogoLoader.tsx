import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/utils/utils';
import { DragonflyLoader } from './DragonflyLoader';

interface LogoLoaderProps {
  /** Height of the bars in px. */
  size?: number;
  className?: string;
}

/** From this size up there is room for the logo itself; below it the mark would be a smudge. */
const DRAGONFLY_MIN = 24;
/** From this size up the wings animate too (`sweep`); smaller dragonflies only tick. */
const SWEEP_MIN = 28;

/**
 * App-wide indeterminate loading indicator. Use it for every "working, no known end" state
 * instead of a spinner. What it draws depends on the room it is given:
 *
 * - under 24px (buttons, pills, inputs, toasts): equalizer bars (redesign sheet 08). They take
 *   `currentColor`, iris by default, so `className="text-…"` recolours them.
 * - 24px to 27px (cards, small panels): the dragonfly logo, body ticking.
 * - 28px and up (a page or section fetching its data): the dragonfly, wings lighting up.
 *
 * The dragonfly is always brand-coloured, so a `text-…` class only affects the bars. For
 * page-level and long waits use DragonflyLoader's `hover` and `wander` directly.
 */
export function LogoLoader({ size = 16, className }: LogoLoaderProps) {
  const { t } = useTranslation();
  if (size >= DRAGONFLY_MIN) {
    return <DragonflyLoader variant={size >= SWEEP_MIN ? 'sweep' : 'tick'} size={size} className={className} />;
  }
  const bars = 3;
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
