import { useMemo, useCallback, useRef } from 'react';
import { formatTime } from '@/shared/utils/format-time';

/**
 * Fallback playback position indicator for sources that don't have a waveform (YouTube, Spotify).
 */
export default function PlaybackProgress({
  playbackPosition,
  duration,
  onSeek,
  loopA,
  loopB,
  onLoopChange
}) {
  const containerRef = useRef(null);

  const pctToTime = useCallback((pct) => {
    return Math.max(0, Math.min(duration, pct * duration));
  }, [duration]);

  const clientXToPct = useCallback((clientX, rect) => {
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (!duration || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = clientXToPct(e.clientX, rect);
    onSeek?.(pctToTime(pct));

    const onMove = (me) => {
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

  const handleLoopHandleDrag = useCallback((which, e) => {
    e.stopPropagation();
    if (!duration || !containerRef.current) return;

    const onMove = (me) => {
      const r = containerRef.current?.getBoundingClientRect();
      if (!r) return;
      const t = pctToTime(clientXToPct(me.clientX, r));
      if (which === 'A') {
        onLoopChange?.(Math.min(t, loopB - 0.1), loopB);
      } else {
        onLoopChange?.(loopA, Math.max(t, loopA + 0.1));
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [duration, loopA, loopB, onLoopChange, pctToTime, clientXToPct]);

  const rulerTicks = useMemo(() => {
    if (!duration || duration <= 0) return [];
    // Pick interval so we have ~8-12 labels max
    const intervals = [5, 10, 15, 30, 60, 120, 300];
    const interval = intervals.find(iv => duration / iv <= 12) ?? 300;
    const ticks = [];
    for (let t = 0; t <= duration; t += interval) {
      ticks.push({ t, pct: (t / duration) * 100 });
    }
    return ticks;
  }, [duration]);

  const playbackPct = duration > 0 ? Math.min(100, (playbackPosition / duration) * 100) : 0;
  const loopAPct = loopA != null && duration > 0 ? (loopA / duration) * 100 : null;
  const loopBPct = loopB != null && duration > 0 ? (loopB / duration) * 100 : null;

  return (
    <div className="w-full flex flex-col gap-0 mt-2 animate-fade-in">
      {/* Main progress bar container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        role="button"
        aria-label="Seek playback"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') onSeek?.(Math.min(duration, playbackPosition + 5));
          else if (e.key === 'ArrowLeft') onSeek?.(Math.max(0, playbackPosition - 5));
        }}
        className="w-full h-8 relative rounded-xl overflow-hidden bg-zinc-900/60 border border-zinc-800/60 cursor-pointer group shadow-inner"
      >
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/50 to-zinc-800/20" />

        {/* Progress fill overlay */}
        <div
          className="absolute h-full bg-primary/10 border-r border-primary/30"
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

        {/* Playback indicator line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 -translate-x-1/2 pointer-events-none z-30"
          style={{ left: `${playbackPct}%`, background: 'var(--color-primary)', boxShadow: '0 0 12px var(--color-primary)' }}
        />

        {/* Playhead glow effect */}
        <div
          className="absolute top-0 bottom-0 w-24 -translate-x-1/2 pointer-events-none z-0 opacity-10 bg-gradient-to-r from-transparent via-primary to-transparent"
          style={{ left: `${playbackPct}%` }}
        />
      </div>

      {/* Ruler with time labels */}
      <div className="w-full h-5 relative select-none mt-1.5 px-0.5">
        {rulerTicks.map(({ t, pct }) => (
          <div
            key={t}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-px h-1.5 bg-zinc-700/60" />
            <span className="text-[9px] text-zinc-500 font-mono tabular-nums mt-0.5 leading-none whitespace-nowrap">
              {formatTime(t)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
