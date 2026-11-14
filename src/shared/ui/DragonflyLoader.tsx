import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/utils/utils';
import {
  BODY, HEAD, LEFT_WINGS, RIGHT_WINGS, TAIL_DOTS, WING_H, WING_STROKE, outlinedWing,
} from './logo-geometry';

/**
 * - `hover`: bobs in place, wings flapping. Page-level waits: the app gate and route chunks.
 * - `wander`: flies a dotted loop, a different one each time. Long waits with no known end (server cold start,
 *   retried saves), where a loader standing still for half a minute reads as hung.
 * - `sweep`: wings light up line by line, like lyrics being sung. A page or section fetching
 *   its data.
 * - `tick`: the body ticks from head to tail, wings still. Small panels and cards, where
 *   flapping wings would be noise.
 */
export type DragonflyVariant = 'hover' | 'wander' | 'sweep' | 'tick';

interface DragonflyLoaderProps {
  variant?: DragonflyVariant;
  /** Height of the dragonfly in px. `wander` is about 4.6 times as wide and twice as tall. */
  size?: number;
  /** `wander` only: pin one of the preset flight paths (by index) instead of a random one. */
  track?: number;
  className?: string;
}

/** Fan angle per wing bar, top to bottom: the outer bars swing, the middle one barely moves. */
const FLAP_DEG = [14, 3, -12];

/** The field `wander` flies over, for a 52px dragonfly. */
const TRACK = { w: 480, h: 200, fly: 52 };
/**
 * Flight paths for `wander`, on the TRACK field. Each is a closed loop of cubic segments
 * (`[c1x, c1y, c2x, c2y, x, y]`, starting from the last segment's end point) whose joints are
 * smooth, so the dragonfly never snaps round a corner. One is picked at random per mount.
 */
const TRACKS: readonly (readonly number[][])[] = [
  // Figure-eight.
  [[300, 20, 420, 20, 420, 100], [420, 180, 300, 180, 240, 100], [180, 20, 60, 20, 60, 100], [60, 180, 180, 180, 240, 100]],
  // Wide oval.
  [[340, 30, 430, 60, 430, 100], [430, 140, 340, 170, 240, 170], [140, 170, 50, 140, 50, 100], [50, 60, 140, 30, 240, 30]],
  // Wave: an oval pinched into an S.
  [[60, 40, 150, 30, 240, 70], [330, 110, 420, 40, 420, 100], [420, 160, 330, 170, 240, 130], [150, 90, 60, 160, 60, 100]],
  // Lopsided eight: a big loop and a small one.
  [[250, 30, 430, 20, 430, 100], [430, 180, 250, 170, 200, 100], [170, 58, 60, 50, 60, 100], [60, 150, 170, 142, 200, 100]],
];
function trackPath(track: readonly number[][], k: number) {
  const n = (v: number) => Math.round(v * k * 100) / 100;
  const [sx, sy] = track[track.length - 1].slice(4);
  return `M${n(sx)} ${n(sy)} ${track.map((seg) => `C${seg.map(n).join(' ')}`).join(' ')} Z`;
}

function Dragonfly({ size, variant }: { size: number; variant: DragonflyVariant }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="df-body" aria-hidden="true">
      {LEFT_WINGS.map((b, i) => (
        <rect
          key={`l${b.y}`}
          className="df-wing df-wing-l"
          style={{ '--df-flap': `${FLAP_DEG[i]}deg`, '--df-i': i * 2 } as CSSProperties}
          x={b.x} y={b.y} width={b.w} height={WING_H} rx={WING_H / 2}
          fill="var(--color-iris)"
        />
      ))}
      {RIGHT_WINGS.map((b, i) => (
        <rect
          key={`r${b.y}`}
          className="df-wing df-wing-r"
          style={{ '--df-flap': `${-FLAP_DEG[i]}deg`, '--df-i': i * 2 + 1 } as CSSProperties}
          {...outlinedWing(b)}
          fill="none" stroke="var(--color-iris)" strokeWidth={WING_STROKE}
        />
      ))}
      <g fill="var(--color-gold)">
        <circle className="df-seg" style={{ '--df-i': 0 } as CSSProperties} cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} />
        {variant === 'wander' ? (
          // The dotted track already reads as the tail left behind, so the body is a plain bar.
          <rect
            className="df-seg"
            x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h + 6} rx={BODY.w / 2}
          />
        ) : (
          <>
            <rect
              className="df-seg"
              style={{ '--df-i': 1 } as CSSProperties}
              x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} rx={BODY.w / 2}
            />
            {TAIL_DOTS.map((d, i) => (
              <circle
                key={d.cy}
                className="df-seg"
                style={{ '--df-i': i + 2 } as CSSProperties}
                cx={HEAD.cx} cy={d.cy} r={d.r}
              />
            ))}
          </>
        )}
      </g>
    </svg>
  );
}

/**
 * The logo as a loading indicator, in four motions (see DragonflyVariant for which wait each
 * one is for). Most call sites should keep using LogoLoader, which picks by size; reach for
 * this directly when the wait itself, not the size, decides the motion.
 *
 * Always brand-coloured: unlike the equalizer bars it does not take `currentColor`.
 */
export function DragonflyLoader({ variant = 'hover', size = 48, track, className }: DragonflyLoaderProps) {
  const { t } = useTranslation();
  const label = t('common.loading');
  // Random per mount, not per render: a path that changed mid-flight would teleport the fly.
  const [randomTrack] = useState(() => Math.floor(Math.random() * TRACKS.length));

  if (variant === 'wander') {
    const k = size / TRACK.fly;
    const points = TRACKS[(track ?? randomTrack) % TRACKS.length];
    const path = trackPath(points, k);
    return (
      <span
        role="status"
        aria-label={label}
        className={cn('df df-wander shrink-0', className)}
        style={{ width: TRACK.w * k, height: TRACK.h * k }}
      >
        <svg viewBox={`0 0 ${TRACK.w} ${TRACK.h}`} className="df-track" aria-hidden="true">
          <path d={trackPath(points, 1)} />
        </svg>
        <span className="df-fly" style={{ width: size, height: size, offsetPath: `path('${path}')` }}>
          <Dragonfly size={size} variant={variant} />
        </span>
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-label={label}
      className={cn('df shrink-0 align-middle', `df-${variant}`, className)}
      style={{ width: size, height: size }}
    >
      <Dragonfly size={size} variant={variant} />
    </span>
  );
}
