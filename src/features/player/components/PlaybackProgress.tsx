import { useMemo, useCallback, useRef, useState, useLayoutEffect } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime } from '@/shared/utils/format-time';
import { formatTimestamp } from '@/shared/utils/lrc';
import { SectionBands, LineMarkers } from './TimelineOverview';

interface PlaybackProgressProps {
  playbackPosition: number;
  duration: number;
  onSeek?: (time: number) => void;
  loopA?: number | null;
  loopB?: number | null;
  onLoopChange?: (a: number, b: number) => void;
  /** Sections and timed lines, drawn as bands above the bar and ticks below it. */
  lines?: readonly { type?: string; label?: string; timestamp?: number | null }[];
}

const NO_LINES: NonNullable<PlaybackProgressProps['lines']> = [];

/**
 * Fallback playback position indicator for sources that don't have a waveform (YouTube).
 */
export default function PlaybackProgress({
  playbackPosition,
  duration,
  onSeek,
  loopA,
  loopB,
  onLoopChange,
  lines = NO_LINES,
}: PlaybackProgressProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const pctToTime = useCallback((pct: number) => {
    return Math.max(0, Math.min(duration, pct * duration));
  }, [duration]);

  const clientXToPct = useCallback((clientX: number, rect: DOMRect) => {
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleMouseDown = useCallback((e: ReactMouseEvent) => {
    if (!duration || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = clientXToPct(e.clientX, rect);
    onSeek?.(pctToTime(pct));

    const onMove = (me: MouseEvent) => {
      const r = containerRef.current?.getBoundingClientRect();
      if (!r) return;
      onSeek?.(pctToTime(clientXToPct(me.clientX, r)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [duration, onSeek, pctToTime, clientXToPct]);

  const handleLoopHandleDrag = useCallback((which: 'A' | 'B', e: ReactMouseEvent) => {
    e.stopPropagation();
    if (!duration || !containerRef.current) return;

    const onMove = (me: MouseEvent) => {
      const r = containerRef.current?.getBoundingClientRect();
      if (!r) return;
      const time = pctToTime(clientXToPct(me.clientX, r));
      if (which === 'A') {
        onLoopChange?.(Math.min(time, (loopB ?? 0) - 0.1), loopB ?? 0);
      } else {
        onLoopChange?.(loopA ?? 0, Math.max(time, (loopA ?? 0) + 0.1));
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [duration, loopA, loopB, onLoopChange, pctToTime, clientXToPct]);

  // Label density has to follow the track's real width, not a fixed count: on a
  // phone the old "up to 12 labels" rule asked for ~576px of labels inside a
  // 358px track, so the end ones collided with their neighbours.
  const rulerRef = useRef<HTMLDivElement>(null);
  const [rulerWidth, setRulerWidth] = useState(0);
  useLayoutEffect(() => {
    const el = rulerRef.current;
    if (!el) return;
    const measure = () => setRulerWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rulerTicks = useMemo(() => {
    if (!duration || duration <= 0) return [];
    // ~56px per label keeps "00:00.00" from touching its neighbour.
    const maxLabels = Math.max(2, Math.floor((rulerWidth || 600) / 56));
    const intervals = [5, 10, 15, 30, 60, 120, 300];
    const interval = intervals.find(iv => duration / iv <= maxLabels - 1) ?? 300;
    const ticks: { t: number; pct: number }[] = [];
    for (let time = 0; time <= duration; time += interval) {
      ticks.push({ t: time, pct: (time / duration) * 100 });
    }
    return ticks;
  }, [duration, rulerWidth]);

  const playbackPct = duration > 0 ? Math.min(100, (playbackPosition / duration) * 100) : 0;
  const loopAPct = loopA != null && duration > 0 ? (loopA / duration) * 100 : null;
  const loopBPct = loopB != null && duration > 0 ? (loopB / duration) * 100 : null;

  return (
    <div className="w-full flex flex-col gap-0 mt-2 animate-fade-in">
      <SectionBands lines={lines} duration={duration} reserveSpace />
      {/* The bar and the time bubble share this box so the bubble can sit above the
          track without being clipped by its rounded corners. */}
      <div className="relative mt-2">
      {/* Main progress bar container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        role="slider"
        aria-label={t('player.seekPlayback')}
        aria-valuemin={0}
        aria-valuemax={duration || 0}
        aria-valuenow={playbackPosition}
        aria-valuetext={formatTime(playbackPosition)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') onSeek?.(Math.min(duration, playbackPosition + 5));
          else if (e.key === 'ArrowLeft') onSeek?.(Math.max(0, playbackPosition - 5));
        }}
        className="w-full h-8 relative rounded-[10px] overflow-hidden bg-card inset-ring inset-ring-hl cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus"
      >
        {/* Progress fill overlay */}
        <div
          className="absolute h-full bg-primary-soft"
          style={{ width: `${playbackPct}%` }}
        />

        {/* Loop region overlay */}
        {loopAPct != null && loopBPct != null && (
          <div
            className="absolute top-0 bottom-0 bg-violet-500/15 border-x border-violet-400/40 pointer-events-none z-10"
            style={{ left: `${loopAPct}%`, width: `${loopBPct - loopAPct}%` }}
          />
        )}

        {/* Loop handle A */}
        {loopAPct != null && (
          <div
            role="presentation"
            className="absolute top-0 bottom-0 w-4 -translate-x-1/2 cursor-ew-resize z-20 flex items-center justify-center group/handle"
            style={{ left: `${loopAPct}%` }}
            onMouseDown={(e) => handleLoopHandleDrag('A', e)}
          >
            <div className="w-1.5 h-6 bg-violet-400 rounded-full group-hover/handle:bg-violet-300 transition-colors shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
          </div>
        )}

        {/* Loop handle B */}
        {loopBPct != null && (
          <div
            role="presentation"
            className="absolute top-0 bottom-0 w-4 -translate-x-1/2 cursor-ew-resize z-20 flex items-center justify-center group/handle"
            style={{ left: `${loopBPct}%` }}
            onMouseDown={(e) => handleLoopHandleDrag('B', e)}
          >
            <div className="w-1.5 h-6 bg-violet-400 rounded-full group-hover/handle:bg-violet-300 transition-colors shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
          </div>
        )}

      </div>

        {/* Playhead: foam, the one colour on the timeline that is not the accent, with the
            exact time riding on it. The bubble is clamped so it stays inside the track. */}
        <div
          aria-hidden
          className="absolute -top-1.5 -bottom-1.5 w-0.5 -translate-x-1/2 rounded-sm bg-foam pointer-events-none z-30"
          style={{ left: `${playbackPct}%` }}
        />
        <span
          aria-hidden
          className="absolute -top-[30px] z-30 rounded-md bg-foam px-[7px] py-[3px] font-mono text-[11px] leading-none font-semibold tabular-nums text-background pointer-events-none whitespace-nowrap"
          style={{ left: `clamp(0px, calc(${playbackPct}% - 28px), calc(100% - 56px))` }}
        >
          {formatTimestamp(playbackPosition)}
        </span>
      </div>

      <div className="mt-2">
        <LineMarkers lines={lines} duration={duration} />
      </div>

      {/* Ruler with time labels */}
      {/* overflow-hidden so the end labels cannot widen the row: each is centred
          on its tick, so the first and last hang half outside the track. */}
      <div ref={rulerRef} className="w-full h-5 relative select-none mt-1 px-0.5 overflow-hidden">
        {rulerTicks.map(({ t: tickTime, pct }, idx) => (
          <div
            key={tickTime}
            className="absolute top-0 flex flex-col items-center"
            style={{
              left: `${pct}%`,
              // Pull the outer labels inside the track instead of centring them
              // on a tick that sits on the very edge.
              transform: `translateX(${idx === 0 ? '0' : idx === rulerTicks.length - 1 ? '-100%' : '-50%'})`,
            }}
          >
            <div className="w-px h-1.5 bg-hl" />
            <span className="text-[11px] font-medium text-subtle font-mono tabular-nums mt-0.5 leading-none whitespace-nowrap">
              {formatTime(tickTime)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
