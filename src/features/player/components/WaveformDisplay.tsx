import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { formatTime } from '@/shared/utils/format-time';

interface WaveLine {
  timestamp?: number | null;
  [key: string]: unknown;
}

interface WaveformDisplayProps {
  showWaveform?: boolean;
  waveformSnap?: boolean;
  audioRef: RefObject<HTMLAudioElement | null>;
  localUrl?: string | null;
  lines?: WaveLine[];
  playbackPosition: number;
  duration: number;
  onSeek?: (time: number) => void;
  loopA?: number | null;
  loopB?: number | null;
  onLoopChange?: (a: number, b: number) => void;
}

/**
 * Enhanced Waveform display with:
 * - Click/drag to seek
 * - Draggable playback line
 * - A-B loop region overlay with draggable handles
 * - Ruler with labelled tick marks
 */
const WaveformDisplay = ({
  showWaveform,
  waveformSnap,
  audioRef,
  localUrl,
  lines,
  playbackPosition,
  duration,
  onSeek,
  loopA,
  loopB,
  onLoopChange,
}: WaveformDisplayProps) => {
  const waveContainerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  // RegionsPlugin instance — wavesurfer plugin types are loose; keep as any.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const regionsRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  // ─── Seek on click/drag ───────────────────────────────────────────────────
  const isDraggingPlayhead = useRef(false);

  const pctToTime = useCallback((pct: number) => {
    return Math.max(0, Math.min(duration, pct * duration));
  }, [duration]);

  const snapTime = useCallback((time: number) => {
    if (!waveformSnap || !lines?.length) return time;
    const threshold = Math.max(0.5, duration * 0.02);
    let closest: number | null = null;
    let minDist = Infinity;
    for (const line of lines) {
      if (line.timestamp != null) {
        const dist = Math.abs(line.timestamp - time);
        if (dist < minDist && dist <= threshold) {
          minDist = dist;
          closest = line.timestamp;
        }
      }
    }
    return closest ?? time;
  }, [waveformSnap, lines, duration]);

  const clientXToPct = useCallback((clientX: number, rect: DOMRect) => {
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleWaveMouseDown = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!isReady || !duration || !waveContainerRef.current) return;
    isDraggingPlayhead.current = true;
    const rect = waveContainerRef.current.getBoundingClientRect();
    const pct = clientXToPct(e.clientX, rect);
    onSeek?.(snapTime(pctToTime(pct)));

    const onMove = (me: MouseEvent) => {
      const r = waveContainerRef.current?.getBoundingClientRect();
      if (!r) return;
      onSeek?.(snapTime(pctToTime(clientXToPct(me.clientX, r))));
    };
    const onUp = () => {
      isDraggingPlayhead.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [isReady, duration, onSeek, pctToTime, clientXToPct, snapTime]);

  // ─── Loop handle drag ─────────────────────────────────────────────────────
  const handleLoopHandleDrag = useCallback((which: 'A' | 'B', e: ReactMouseEvent) => {
    e.stopPropagation();
    if (!duration || !waveContainerRef.current) return;

    const onMove = (me: MouseEvent) => {
      const r = waveContainerRef.current?.getBoundingClientRect();
      if (!r) return;
      const t = pctToTime(clientXToPct(me.clientX, r));
      if (which === 'A') {
        onLoopChange?.(Math.min(t, (loopB ?? 0) - 0.1), loopB ?? 0);
      } else {
        onLoopChange?.(loopA ?? 0, Math.max(t, (loopA ?? 0) + 0.1));
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [duration, loopA, loopB, onLoopChange, pctToTime, clientXToPct]);

  // ─── Sync wavesurfer with audio element ──────────────────────────────────
  useEffect(() => {
    if (!wavesurferRef.current || !audioRef.current || !isReady) return;
    const ws = wavesurferRef.current;
    const audio = audioRef.current;
    const handleTimeUpdate = () => {
      if (Math.abs(ws.getCurrentTime() - audio.currentTime) > 0.1) {
        ws.setTime(audio.currentTime);
      }
    };
    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [isReady, audioRef]);

  // ─── Initialise WaveSurfer ────────────────────────────────────────────────
  useEffect(() => {
    if (!showWaveform || !localUrl) return;
    if (wavesurferRef.current) wavesurferRef.current.destroy();
    if (!waveContainerRef.current) return;

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1DB954';

    const ws = WaveSurfer.create({
      container: waveContainerRef.current,
      waveColor: primaryColor + '55',
      progressColor: primaryColor,
      cursorColor: 'transparent', // we draw our own cursor
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 40,
      normalize: true,
      interact: false,
      hideScrollbar: true,
    });

    const regions = ws.registerPlugin(RegionsPlugin.create());
    regionsRef.current = regions;
    wavesurferRef.current = ws;

    const offReady = ws.on('ready', () => {
      setIsReady(true);
      if (audioRef.current) ws.setTime(audioRef.current.currentTime);
    });

    ws.load(localUrl);

    return () => {
      try {
        offReady?.();
        ws.destroy();
      } catch { /* ignore abort errors on unmount */ }
      setIsReady(false);
    };
  }, [showWaveform, localUrl, audioRef]);

  // ─── Draw static line markers on the waveform ─────────────────────────────
  useEffect(() => {
    if (!wavesurferRef.current || !isReady || !lines?.length || !duration) return;
    const regions = regionsRef.current;

    // Clear only non-active static regions to avoid flickering the active highlight
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    regions.getRegions().forEach((r: any) => {
      if (r.id !== 'active-line-span') r.remove();
    });

    lines.forEach((line) => {
      if (line.timestamp != null) {
        regions.addRegion({
          start: line.timestamp,
          end: line.timestamp + 0.06,
          color: 'rgba(255,255,255,0.2)',
          drag: false,
          resize: false,
        });
      }
    });
  }, [isReady, lines, duration]);

  // ─── Update active region only when playbackPosition changes ─────────────
  useEffect(() => {
    if (!wavesurferRef.current || !isReady || !lines?.length || !duration) return;
    const regions = regionsRef.current;

    let activeLine: WaveLine | null = null;
    let nextTs = duration;

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (line.timestamp != null) {
        const next = lines[idx + 1]?.timestamp || duration;
        if (playbackPosition >= line.timestamp && playbackPosition < next) {
          activeLine = line;
          nextTs = next;
          break;
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingActive = regions.getRegions().find((r: any) => r.id === 'active-line-span');

    if (activeLine) {
      if (existingActive) {
        // Only update if boundary values have changed to save CPU cycles
        if (existingActive.start !== activeLine.timestamp || existingActive.end !== nextTs) {
          existingActive.update({
            start: activeLine.timestamp,
            end: nextTs,
          });
        }
      } else {
        regions.addRegion({
          id: 'active-line-span',
          start: activeLine.timestamp,
          end: nextTs,
          color: 'rgba(29,185,84,0.10)',
          drag: false,
          resize: false,
        });
      }
    } else if (existingActive) {
      existingActive.remove();
    }
  }, [isReady, lines, duration, playbackPosition]);

  // ─── Ruler tick logic ─────────────────────────────────────────────────────
  const rulerTicks = useMemo(() => {
    if (!duration || duration <= 0) return [];
    // Pick interval so we have ~8 labels max
    const intervals = [5, 10, 15, 30, 60, 120, 300];
    const interval = intervals.find(iv => duration / iv <= 12) ?? 300;
    const ticks: { t: number; pct: number }[] = [];
    for (let t = 0; t <= duration; t += interval) {
      ticks.push({ t, pct: (t / duration) * 100 });
    }
    return ticks;
  }, [duration]);

  const playbackPct = duration > 0 ? Math.min(100, (playbackPosition / duration) * 100) : 0;
  const loopAPct = loopA != null && duration > 0 ? (loopA / duration) * 100 : null;
  const loopBPct = loopB != null && duration > 0 ? (loopB / duration) * 100 : null;

  if (!showWaveform) return null;

  return (
    <div className="w-full flex flex-col gap-0 mt-2">
      {/* Main waveform + overlays */}
      <div
        ref={waveContainerRef}
        role="presentation"
        className="w-full h-10 relative rounded-lg overflow-hidden bg-zinc-900/40 border border-zinc-800/50 cursor-pointer select-none"
        onMouseDown={handleWaveMouseDown}
      >
        {/* WaveSurfer renders inside here */}

        {/* Loading skeleton */}
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/60 backdrop-blur-[2px]">
            <div className="flex gap-1">
              {[0, 1, 2].map(n => (
                <div key={n} className="w-1 h-3 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: `${n * 0.1}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Loop region overlay */}
        {isReady && loopAPct != null && loopBPct != null && (
          <div
            className="absolute top-0 bottom-0 bg-violet-500/20 border-x border-violet-400/60 pointer-events-none z-10"
            style={{ left: `${loopAPct}%`, width: `${loopBPct - loopAPct}%` }}
          />
        )}

        {/* Loop handle A */}
        {isReady && loopAPct != null && (
          <div
            role="presentation"
            className="absolute top-0 bottom-0 w-2 -translate-x-1/2 cursor-ew-resize z-20 flex items-center justify-center group"
            style={{ left: `${loopAPct}%` }}
            onMouseDown={(e) => handleLoopHandleDrag('A', e)}
          >
            <div className="w-1 h-6 bg-violet-400 rounded-full group-hover:bg-violet-300 transition-colors shadow-[0_0_6px_rgba(139,92,246,0.8)]" />
          </div>
        )}

        {/* Loop handle B */}
        {isReady && loopBPct != null && (
          <div
            role="presentation"
            className="absolute top-0 bottom-0 w-2 -translate-x-1/2 cursor-ew-resize z-20 flex items-center justify-center group"
            style={{ left: `${loopBPct}%` }}
            onMouseDown={(e) => handleLoopHandleDrag('B', e)}
          >
            <div className="w-1 h-6 bg-violet-400 rounded-full group-hover:bg-violet-300 transition-colors shadow-[0_0_6px_rgba(139,92,246,0.8)]" />
          </div>
        )}

        {/* Playback line */}
        {isReady && (
          <div
            className="absolute top-0 bottom-0 w-0.5 -translate-x-1/2 pointer-events-none z-30"
            style={{ left: `${playbackPct}%`, background: 'var(--color-primary)', boxShadow: '0 0 8px var(--color-primary)' }}
          />
        )}
      </div>

      {/* Ruler with labelled ticks */}
      {isReady && duration > 0 && (
        <div className="w-full h-5 relative select-none">
          {rulerTicks.map(({ t, pct }) => (
            <div
              key={t}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-px h-1.5 bg-zinc-700" />
              <span className="text-[9px] text-zinc-500 font-mono tabular-nums mt-0.5 leading-none whitespace-nowrap">
                {formatTime(t)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WaveformDisplay;
