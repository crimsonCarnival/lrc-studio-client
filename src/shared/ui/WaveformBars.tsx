import { useMemo } from 'react';
import { cn } from '@/shared/utils/utils';

/** Deterministic pseudo-random bar heights (0-100) derived from a seed string. */
function waveformHeights(seed: string, count: number, minHeight = 18): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    const envelope = Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 0.55 + 0.45;
    out.push(Math.round((minHeight + (h % 70)) * envelope));
  }
  return out;
}

interface WaveformBarsProps {
  seed: string;
  count?: number;
  minHeight?: number;
  className?: string;
  barClassName?: string;
}

/** Decorative waveform used as a placeholder thumbnail; carries no audio data. */
export function WaveformBars({ seed, count = 30, minHeight = 18, className, barClassName }: WaveformBarsProps) {
  const heights = useMemo(() => waveformHeights(seed, count, minHeight), [seed, count, minHeight]);
  return (
    <div aria-hidden="true" className={cn('flex items-center justify-center gap-[3px] h-full', className)}>
      {heights.map((height, i) => (
        <span key={i} className={cn('block w-1 shrink-0 rounded-full bg-primary/55', barClassName)} style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}
