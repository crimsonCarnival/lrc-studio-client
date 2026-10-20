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

  // How lit each dot is, 0-1: full ones 1, the one being filled its fraction, the rest 0.
  const filled = p * count;

  // Every dot is the same two layers, a dim base and a fill whose opacity is the
  // only thing that changes. Swapping a dot between differently styled branches
  // (dim background -> full-colour background at opacity ~0) flashed it at full
  // colour for the length of the opacity transition each time a dot started.
  return (
    <span
      aria-hidden
      role="presentation"
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: `${gap}px`, ...style }}
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          style={{
            position: 'relative',
            display: 'inline-block',
            width: size,
            height: size,
            borderRadius: '50%',
            background: dimColor,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: color,
              opacity: Math.max(0, Math.min(1, filled - i)),
              transition: 'opacity 0.15s linear',
            }}
          />
        </span>
      ))}
    </span>
  );
}
