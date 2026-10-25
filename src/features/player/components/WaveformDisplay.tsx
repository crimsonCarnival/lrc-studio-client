import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { useTranslation } from 'react-i18next';
import { formatTime } from '@/shared/utils/format-time';
import { computeSectionBands } from '../timeline-bands';
import { SectionBands } from './TimelineOverview';

interface WaveLine {
  type?: string;
  label?: string;
  timestamp?: number | null;
  [key: string]: unknown;
}

// Bars sit on a baseline 70% of the way down; what falls below it is the dimmed reflection.
const WAVE_HEIGHT = 64;
const BASELINE = 0.7;
const BAR_WIDTH = 3;
const BAR_GAP = 1;

// WaveSurfer paints its progress layer by recolouring whatever this draws (source-in), so
// the reflection's lower alpha survives into the played half.
function drawSoundCloudBars(peaks: Array<Float32Array | number[]>, ctx: CanvasRenderingContext2D) {
  const { width, height } = ctx.canvas;
  const dpr = height / WAVE_HEIGHT;
  const channel = peaks[0];
  if (!channel?.length) return;

  const step = (BAR_WIDTH + BAR_GAP) * dpr;
  const bars = Math.floor(width / step);
  const base = height * BASELINE;
  let peakMax = 0;
  for (const c of peaks) for (let i = 0; i < c.length; i++) peakMax = Math.max(peakMax, Math.abs(c[i]));
  if (peakMax === 0) return;

  for (let b = 0; b < bars; b++) {
    const from = Math.floor((b / bars) * channel.length);
    const to = Math.max(from + 1, Math.floor(((b + 1) / bars) * channel.length));
    let level = 0;
    for (let i = from; i < to; i++) level = Math.max(level, Math.abs(channel[i]));
    const h = Math.max(2 * dpr, (level / peakMax) * base);
    const x = b * step;
    const w = BAR_WIDTH * dpr;
    ctx.globalAlpha = 1;
    ctx.fillRect(x, base - h, w, h);
    ctx.globalAlpha = 0.4;
    ctx.fillRect(x, base, w, h * ((1 - BASELINE) / BASELINE));
  }
  ctx.globalAlpha = 1;
}

// Canvas colours can't take a CSS variable, so the tokens are resolved first. The unplayed
// colour has to be opaque: the progress layer inherits the alpha of what was drawn.
function unplayedColor(primary: string, background: string): string {
  return CSS.supports('color', 'color-mix(in srgb, red 50%, blue)') && background
    ? `color-mix(in srgb, ${primary} 35%, ${background})`
    : primary;
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
  const { t } = useTranslation();
  const waveContainerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  // RegionsPlugin instance — wavesurfer plugin types are loose; keep as any.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const regionsRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [hoverPct, setHoverPct] = useState<number | null>(null);

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

  const handleWavePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isReady || !duration || !waveContainerRef.current) return;
    isDraggingPlayhead.current = true;
    const rect = waveContainerRef.current.getBoundingClientRect();
    const pct = clientXToPct(e.clientX, rect);
    onSeek?.(snapTime(pctToTime(pct)));

    const onMove = (me: PointerEvent) => {
      const r = waveContainerRef.current?.getBoundingClientRect();
      if (!r) return;
      onSeek?.(snapTime(pctToTime(clientXToPct(me.clientX, r))));
    };
    const onUp = () => {
      isDraggingPlayhead.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [isReady, duration, onSeek, pctToTime, clientXToPct, snapTime]);

  // ─── Loop handle drag ─────────────────────────────────────────────────────
  const handleLoopHandleDrag = useCallback((which: 'A' | 'B', e: ReactPointerEvent) => {
    e.stopPropagation();
    if (!duration || !waveContainerRef.current) return;

    const onMove = (me: PointerEvent) => {
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
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
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

    const rootStyle = getComputedStyle(document.documentElement);
    const primaryColor = rootStyle.getPropertyValue('--color-primary').trim() || '#1DB954';

    const ws = WaveSurfer.create({
      container: waveContainerRef.current,
      waveColor: unplayedColor(primaryColor, rootStyle.getPropertyValue('--background').trim()),
      progressColor: primaryColor,
      cursorColor: 'transparent', // we draw our own cursor
      renderFunction: drawSoundCloudBars,
      height: WAVE_HEIGHT,
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

    // load() rejects with AbortError if the instance is destroyed mid-fetch
    // (source change / unmount) — swallow it so it doesn't surface as an
    // unhandled promise rejection.
    ws.load(localUrl).catch(() => { });

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
          // wavesurfer v7 renamed region.update() to setOptions()
          existingActive.setOptions({
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

  // Section boundaries cut the wave into blocks, as the bands above it do; the first
  // section starting at 0 needs no cut.
  const sectionCuts = useMemo(
    () => computeSectionBands(lines ?? [], duration).map((b) => b.start).filter((start) => start > 0),
    [lines, duration],
  );

  const handleSeekKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!isReady || !duration) return;
    if (e.key === 'ArrowRight') onSeek?.(Math.min(duration, playbackPosition + 5));
    else if (e.key === 'ArrowLeft') onSeek?.(Math.max(0, playbackPosition - 5));
  };

  const playbackPct = duration > 0 ? Math.min(100, (playbackPosition / duration) * 100) : 0;
  const loopAPct = loopA != null && duration > 0 ? (loopA / duration) * 100 : null;
  const loopBPct = loopB != null && duration > 0 ? (loopB / duration) * 100 : null;

  if (!showWaveform) return null;

  return (
    <div className="w-full flex flex-col gap-0 mt-2">
      <SectionBands lines={lines ?? []} duration={duration} />
      {/* Main waveform + overlays: the wave is the seek bar */}
      <div
        ref={waveContainerRef}
        role="slider"
        tabIndex={isReady ? 0 : -1}
        aria-label={t('player.seekPlayback')}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(playbackPosition)}
        aria-valuetext={`${formatTime(playbackPosition)} / ${formatTime(duration)}`}
        aria-disabled={!isReady}
        className="w-full h-16 relative overflow-hidden cursor-pointer select-none touch-none mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm"
        onPointerDown={handleWavePointerDown}
        onPointerMove={(e) => {
          if (e.pointerType !== 'mouse' || !waveContainerRef.current) return;
          setHoverPct(clientXToPct(e.clientX, waveContainerRef.current.getBoundingClientRect()));
        }}
        onPointerLeave={() => setHoverPct(null)}
        onKeyDown={handleSeekKeyDown}
      >
        {/* WaveSurfer renders inside here */}

        {/* Section cuts */}
        {isReady && sectionCuts.map((start) => (
          <div
            key={start}
            aria-hidden
            className="absolute inset-y-0 w-[3px] -translate-x-1/2 bg-background pointer-events-none z-10"
            style={{ left: `${(start / duration) * 100}%` }}
          />
        ))}

        {/* Hover preview */}
        {isReady && hoverPct != null && (
          <div
            aria-hidden
            className="absolute inset-y-0 w-px bg-foreground/40 pointer-events-none z-20"
            style={{ left: `${hoverPct * 100}%` }}
          >
            <span className="absolute top-0 left-1 rounded bg-background/80 px-1 font-mono text-[10px] tabular-nums text-foreground">
              {formatTime(hoverPct * duration)}
            </span>
          </div>
        )}

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
            onPointerDown={(e) => handleLoopHandleDrag('A', e)}
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
            onPointerDown={(e) => handleLoopHandleDrag('B', e)}
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
