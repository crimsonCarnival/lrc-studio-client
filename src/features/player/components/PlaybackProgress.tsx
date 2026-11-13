import { useCallback, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime } from '@/shared/utils/format-time';
import { formatTimestamp } from '@/shared/utils/lrc';
import { SectionBands, LineMarkers } from './TimelineOverview';
import { usePresenceActions } from '@/features/collab/collab-presence-context';
import { RemotePlayheads } from '@/features/collab/components/RemotePlayheads';

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
  // Null outside a collab session.
  const presence = usePresenceActions();

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
        className="w-full h-8 relative rounded-[calc(var(--radius)*1)] overflow-hidden bg-card inset-ring inset-ring-hl cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus"
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
            <div className="w-1.5 h-6 bg-violet-400 rounded-pill group-hover/handle:bg-violet-300 transition-colors shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
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
            <div className="w-1.5 h-6 bg-violet-400 rounded-pill group-hover/handle:bg-violet-300 transition-colors shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
          </div>
        )}

      </div>

        {presence && <RemotePlayheads duration={duration} onSeek={onSeek} />}

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
    </div>
  );
}
