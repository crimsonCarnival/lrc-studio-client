import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/utils/utils';
import {
  BODY, HEAD, LEFT_WINGS, RIGHT_WINGS, TAIL_DOTS, WING_H, WING_STROKE, outlinedWing,
} from './logo-geometry';

interface LogoMarkProps {
  className?: string;
  /** True for a logo next to visible brand text, where the text itself is the accessible name. */
  decorative?: boolean;
}

/**
 * The brand mark: a dragonfly made of the app's own parts. The playhead is the body, with a
 * tail of timestamp dots; synced lyric lines form the filled left wing and upcoming ones the
 * outlined right wing. Colors are theme tokens so it adapts to both themes instead of
 * shipping as a fixed-color raster image.
 */
export function LogoMark({ className, decorative = false }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'LRC Studio' })}
    >
      <g fill="var(--color-iris)">
        {LEFT_WINGS.map((b) => (
          <rect key={b.y} x={b.x} y={b.y} width={b.w} height={WING_H} rx={WING_H / 2} />
        ))}
      </g>
      <g fill="none" stroke="var(--color-iris)" strokeWidth={WING_STROKE}>
        {RIGHT_WINGS.map((b) => <rect key={b.y} {...outlinedWing(b)} />)}
      </g>
      <g fill="var(--color-gold)">
        <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} />
        <rect x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} rx={BODY.w / 2} />
        {TAIL_DOTS.map((d) => <circle key={d.cy} cx={HEAD.cx} cy={d.cy} r={d.r} />)}
      </g>
    </svg>
  );
}

interface LogoLockupProps {
  className?: string;
  /** Size (and anything else) of the mark; defaults to 28px. */
  markClassName?: string;
  /** Mark above the name instead of beside it. */
  stacked?: boolean;
}

/**
 * The logo with its name: the mark beside (or above) "LRC Studio" in the heading face. Use it
 * wherever the brand introduces itself (landing nav, auth, the drawer); the bare LogoMark is
 * for tight chrome such as the app header. Text size and colour come from `className`.
 */
export function LogoLockup({ className, markClassName, stacked = false }: LogoLockupProps) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center font-heading font-bold tracking-tight',
        stacked ? 'flex-col gap-1.5' : 'gap-2.5',
        className,
      )}
    >
      <LogoMark decorative className={cn('size-7 shrink-0', markClassName)} />
      <span className="truncate">{t('app.name')}</span>
    </span>
  );
}
