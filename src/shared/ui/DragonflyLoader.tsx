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
  // Ring: a circle of radius 80 around the field's centre.
  [[160, 56, 196, 20, 240, 20], [284, 20, 320, 56, 320, 100], [320, 144, 284, 180, 240, 180], [196, 180, 160, 144, 160, 100]],
  // Tight loop: a small circle, for a dragonfly that stays near one spot.
  [[190, 72, 212, 50, 240, 50], [268, 50, 290, 72, 290, 100], [290, 128, 268, 150, 240, 150], [212, 150, 190, 128, 190, 100]],
  // Tall oval: an ellipse standing on its end.
  [[180, 56, 207, 20, 240, 20], [273, 20, 300, 56, 300, 100], [300, 144, 273, 180, 240, 180], [207, 180, 180, 144, 180, 100]],
  // Tall eight: the figure-eight with x squeezed to 45%, a narrow column of loops.
  [[267, 20, 321, 20, 321, 100], [321, 180, 267, 180, 240, 100], [213, 20, 186, 20, 186, 100], [186, 180, 213, 180, 240, 100]],
  // The rest are sampled from a parametric curve and splined (Catmull-Rom), hence more segments.
  // Heart, its two cusps rounded off.
  [[251, 55, 255, 38, 273, 32], [292, 26, 327, 20, 352, 22], [377, 24, 412, 35, 424, 45], [436, 56, 436, 73, 424, 86], [412, 99, 377, 112, 352, 124], [327, 135, 292, 147, 273, 156], [255, 165, 251, 178, 240, 178], [229, 178, 225, 165, 207, 156], [188, 147, 153, 135, 128, 124], [103, 112, 68, 99, 56, 86], [44, 73, 44, 56, 56, 45], [68, 35, 103, 24, 128, 22], [153, 20, 188, 26, 207, 32], [225, 38, 229, 55, 240, 55]],
  // Snake: three loops in a row (Lissajous 1:3).
  [[260, 178, 280, 159, 299, 139], [317, 120, 335, 81, 350, 61], [365, 42, 379, 22, 389, 22], [398, 22, 406, 41, 409, 61], [412, 80, 412, 120, 409, 139], [406, 159, 398, 178, 389, 178], [379, 178, 365, 159, 350, 139], [335, 120, 317, 81, 299, 61], [280, 42, 260, 22, 240, 22], [220, 22, 200, 42, 181, 61], [163, 81, 145, 120, 130, 139], [115, 159, 101, 178, 91, 178], [82, 178, 74, 159, 71, 139], [68, 120, 68, 81, 71, 61], [74, 42, 82, 22, 91, 22], [101, 22, 115, 41, 130, 61], [145, 80, 163, 119, 181, 139], [200, 158, 220, 178, 240, 178]],
  // Trefoil: three petals through the centre.
  [[244, 22, 249, 24, 253, 27], [257, 31, 260, 36, 262, 43], [264, 49, 265, 58, 264, 66], [263, 75, 260, 84, 256, 94], [252, 103, 247, 113, 240, 122], [233, 131, 225, 140, 216, 147], [208, 154, 198, 161, 189, 166], [180, 171, 171, 175, 162, 176], [153, 178, 139, 178, 134, 175], [128, 172, 126, 165, 127, 161], [128, 156, 134, 151, 140, 147], [146, 143, 155, 138, 165, 134], [175, 131, 188, 127, 200, 125], [212, 123, 227, 122, 240, 122], [253, 122, 268, 123, 280, 125], [292, 127, 305, 131, 315, 134], [325, 138, 334, 142, 340, 147], [346, 152, 353, 161, 353, 166], [353, 172, 346, 176, 340, 178], [334, 180, 326, 178, 318, 176], [310, 174, 300, 171, 291, 166], [282, 161, 272, 154, 264, 147], [255, 140, 247, 131, 240, 122], [233, 113, 228, 103, 224, 94], [220, 84, 217, 75, 216, 66], [215, 58, 216, 49, 218, 43], [220, 36, 223, 31, 227, 27], [231, 24, 236, 22, 240, 22]],
  // Loop within a loop (limaçon): a wide circuit with a small inner turn.
  [[392, 113, 383, 128, 369, 140], [354, 151, 330, 162, 306, 168], [282, 175, 250, 178, 224, 178], [198, 178, 169, 174, 148, 168], [127, 163, 110, 153, 100, 144], [89, 136, 86, 125, 88, 116], [90, 108, 100, 99, 110, 94], [120, 88, 136, 85, 148, 84], [161, 83, 175, 85, 183, 88], [191, 90, 197, 96, 197, 100], [197, 104, 191, 110, 183, 112], [175, 115, 161, 117, 148, 116], [136, 115, 120, 112, 110, 106], [100, 101, 90, 92, 88, 84], [86, 75, 89, 64, 100, 56], [110, 47, 127, 37, 148, 32], [169, 26, 198, 22, 224, 22], [250, 22, 282, 25, 306, 32], [330, 38, 354, 49, 369, 60], [383, 72, 392, 87, 392, 100]],
  // Teardrop, point to the right.
  [[213, 27, 241, 33, 267, 39], [292, 45, 321, 53, 342, 60], [363, 67, 383, 75, 394, 83], [405, 90, 409, 98, 405, 105], [402, 112, 389, 120, 372, 127], [355, 135, 330, 143, 306, 150], [282, 157, 252, 164, 227, 169], [203, 173, 178, 178, 158, 178], [139, 178, 123, 177, 110, 171], [98, 166, 90, 157, 84, 147], [78, 137, 76, 123, 75, 110], [74, 97, 74, 81, 78, 69], [81, 57, 86, 46, 95, 38], [104, 30, 115, 24, 131, 22], [147, 20, 168, 21, 191, 24]],
  // Diagonal eight: the figure-eight tipped about 30 degrees.
  [[251, 117, 260, 137, 272, 150], [285, 163, 298, 174, 314, 178], [329, 182, 348, 181, 364, 176], [380, 171, 399, 158, 410, 148], [421, 138, 431, 123, 430, 113], [429, 104, 422, 94, 407, 90], [391, 86, 366, 86, 338, 87], [310, 89, 273, 96, 240, 100], [207, 104, 170, 111, 142, 113], [114, 114, 89, 114, 73, 110], [58, 106, 51, 96, 50, 87], [49, 77, 59, 62, 70, 52], [81, 42, 100, 29, 116, 24], [132, 19, 151, 18, 166, 22], [182, 26, 195, 37, 208, 50], [220, 63, 229, 83, 240, 100]],
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
