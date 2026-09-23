import type { CSSProperties } from 'react';

interface InstrumentalDotsProps {
  /** 0-1 progress through the instrumental segment. */
  progress: number;
  /** CSS color string for filled dots. Defaults to currentColor. */
  color?: string;
  /** Unfilled dot color. */
  dimColor?: string;
  /** Max number of dots. Clamped to [1,7]. Defaults to 4. */
  dotCount?: number;
  /** Dot diameter in px. Defaults to 7. */
  size?: number;
  /** Gap between dots in px. Defaults to 6. */
  gap?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * A row of dots that fill left-to-right proportional to `progress`.
 * Pure presentational - no state, no effects.
 * Used for instrumental / blank lyric lines in both the editor preview and
 * the public viewer to signal how much of the gap remains.
 */
export default function InstrumentalDots({
  progress,
  color = 'currentColor',
  dimColor = 'rgba(255,255,255,0.15)',
  dotCount = 4,
  size = 7,
  gap = 6,
  className,
  style,
}: InstrumentalDotsProps) {
  const count = Math.max(1, Math.min(7, Math.round(dotCount)));
  const p = Math.max(0, Math.min(1, progress));

  // How many dots are fully lit, and what fraction the next one is lit.
  const filled = p * count;
  const fullDots = Math.floor(filled);
  const partial = filled - fullDots;

  return (
    <span
      aria-hidden
      role="presentation"
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: `${gap}px`, ...style }}
    >
      {Array.from({ length: count }, (_, i) => {
        if (i < fullDots) {
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                width: size,
                height: size,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
                transition: 'opacity 0.15s linear',
              }}
            />
          );
        }
        if (i === fullDots) {
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                width: size,
                height: size,
                borderRadius: '50%',
                background: color,
                opacity: partial,
                flexShrink: 0,
                transition: 'opacity 0.15s linear',
              }}
            />
          );
        }
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: size,
              height: size,
              borderRadius: '50%',
              background: dimColor,
              flexShrink: 0,
            }}
          />
        );
      })}
    </span>
  );
}
