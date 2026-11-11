import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { useTranslation } from 'react-i18next';
import { formatTime } from '@/shared/utils/format-time';
import { computeSectionBands } from '../timeline-bands';
import { SectionBands } from './TimelineOverview';
import { usePresenceActions } from '@/features/collab/collab-presence-context';
import { RemotePlayheads } from '@/features/collab/components/RemotePlayheads';

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
  /** The modifier held while clicking to make a loop: 'Shift' | 'Ctrl' | 'Alt'. */
  loopModifier?: string;
}

// The last decoded file's peaks. One entry is enough: only one file plays at a time, and a
// blob URL is never reused for another file.
let peaksCache: { url: string; peaks: Array<Float32Array | number[]>; duration: number } | null = null;

/**
 *Enhanced Waveform display with:
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
  loopModifier = 'Shift',
}: WaveformDisplayProps) => {
  const { t } = useTranslation();
  const waveContainerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  // RegionsPlugin instance — wavesurfer plugin types are loose; keep as any.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const regionsRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  // Null outside a collab session.
  const presence = usePresenceActions();

  // ─── Loop creation: modifier + click on the start, again on the end ─────────
  const [modDown, setModDown] = useState(false);
  // The loop start waiting for its end.
  const [loopDraft, setLoopDraft] = useState<number | null>(null);
  const [hoverTarget, setHoverTarget] = useState<number | null>(null);
  const loopMode = modDown || loopDraft != null;

  // Timed lyric lines as loop targets: where each starts and how long it lasts (to the next
  // timed line, or the end of the track).
  const loopTargets = useMemo(() => {
    const times: { time: number; text: string }[] = [];
    for (const line of lines ?? []) {
      if (line.type === 'section' || line.timestamp == null) continue;
      times.push({ time: line.timestamp, text: typeof line.text === 'string' ? line.text : '' });
    }
    times.sort((a, b) => a.time - b.time);
    return times.map((x, i) => ({ ...x, length: (times[i + 1]?.time ?? duration) - x.time }));
  }, [lines, duration]);

  const modifierHeld = useCallback((e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean }) => {
    if (loopModifier === 'Ctrl') return e.ctrlKey || e.metaKey;
    if (loopModifier === 'Alt') return e.altKey;
    return e.shiftKey;
  }, [loopModifier]);

  useEffect(() => {
    if (!showWaveform) return;
    const sync = (e: KeyboardEvent) => setModDown(modifierHeld(e));
    const release = () => setModDown(false);
    window.addEventListener('keydown', sync);
    window.addEventListener('keyup', sync);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', sync);
      window.removeEventListener('keyup', sync);
      window.removeEventListener('blur', release);
    };
  }, [showWaveform, modifierHeld]);

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
    const rect = waveContainerRef.current.getBoundingClientRect();
    const pct = clientXToPct(e.clientX, rect);

    if (modifierHeld(e)) {
      // A loop click: snap to a lyric line within a few pixels, else take the raw time.
      const raw = pctToTime(pct);
      const tolerance = (10 / rect.width) * duration;
      let time = raw;
      let best = tolerance;
      for (const target of loopTargets) {
        const dist = Math.abs(target.time - raw);
        if (dist <= best) { best = dist; time = target.time; }
      }
      if (loopDraft == null) {
        setLoopDraft(time);
      } else {
        const a = Math.min(loopDraft, time);
        const b = Math.max(loopDraft, time);
        setLoopDraft(null);
        if (b - a >= 0.1) {
          onLoopChange?.(a, b);
          onSeek?.(a);
        }
      }
      return;
    }

    isDraggingPlayhead.current = true;
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
  }, [isReady, duration, onSeek, onLoopChange, pctToTime, clientXToPct, snapTime, modifierHeld, loopTargets, loopDraft]);

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

    // Crossing the layout breakpoint moves the player to another slot, which remounts this
    // component. The peaks of the file already decoded are reused so it draws at once instead of
    // fetching and decoding the whole file again behind the loader.
    const cached = peaksCache?.url === localUrl ? peaksCache : null;

    const offReady = ws.on('ready', () => {
      if (!cached) peaksCache = { url: localUrl, peaks: ws.exportPeaks(), duration: ws.getDuration() };
      setIsReady(true);
      if (audioRef.current) ws.setTime(audioRef.current.currentTime);
    });

    // load() rejects with AbortError if the instance is destroyed mid-fetch
    // (source change / unmount) — swallow it so it doesn't surface as an
    // unhandled promise rejection.
    ws.load(localUrl, cached?.peaks, cached?.duration).catch(() => { });

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
  const sectionStarts = useMemo(
    () => computeSectionBands(lines ?? [], duration).map((b) => b.start),
    [lines, duration],
  );
  const sectionCuts = useMemo(() => sectionStarts.filter((start) => start > 0), [sectionStarts]);

  // The section whose start the playhead sits on, so its band lights up.
  const highlightStart = useMemo(() => {
    for (const start of sectionStarts) if (Math.abs(playbackPosition - start) < 0.25) return start;
    return null;
  }, [sectionStarts, playbackPosition]);

  const handleSeekKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && loopDraft != null) { setLoopDraft(null); return; }
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
      <SectionBands lines={lines ?? []} duration={duration} highlightStart={highlightStart} />
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
          const pct = clientXToPct(e.clientX, waveContainerRef.current.getBoundingClientRect());
          setHoverPct(pct);
          if (duration > 0) presence?.setPointer({ area: 'waveform', time: pct * duration });
        }}
        onPointerLeave={() => {
          setHoverPct(null);
          presence?.setPointer(null);
        }}
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
            <span className="absolute top-0 left-1 rounded-xs bg-background/80 px-1 font-mono text-[10px] tabular-nums text-foreground">
              {formatTime(hoverPct * duration)}
            </span>
          </div>
        )}

        {/* Loading skeleton */}
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/60 backdrop-blur-[2px]">
            <div className="flex gap-1">
              {[0, 1, 2].map(n => (
                <div key={n} className="w-1 h-3 bg-primary/40 rounded-pill animate-pulse" style={{ animationDelay: `${n * 0.1}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Loop creation: every timed line becomes an easy target, and hovering one says what it is. */}
        {isReady && loopMode && loopTargets.map((target, i) => (
          <div
            key={`${target.time}-${i}`}
            aria-hidden
            className="absolute inset-y-0 z-20 w-3 -translate-x-1/2 cursor-crosshair"
            style={{ left: `${(target.time / duration) * 100}%` }}
            onPointerEnter={() => setHoverTarget(i)}
            onPointerLeave={() => setHoverTarget((cur) => (cur === i ? null : cur))}
          >
            <div className={`mx-auto h-full rounded-pill transition-all ${hoverTarget === i ? 'w-1 bg-primary shadow-[0_0_8px_var(--color-primary)]' : 'w-0.5 bg-primary/80'}`} />
          </div>
        ))}
        {isReady && loopMode && hoverTarget != null && loopTargets[hoverTarget] && (
          <div
            aria-hidden
            className="pointer-events-none absolute top-1 z-30 max-w-[16rem] -translate-x-1/2 truncate rounded-xs border border-border bg-card px-2 py-1 text-xs text-foreground shadow-sm"
            style={{ left: `clamp(8rem, ${(loopTargets[hoverTarget].time / duration) * 100}%, calc(100% - 8rem))` }}
          >
            <span className="font-mono tabular-nums text-muted-foreground">
              {formatTime(loopTargets[hoverTarget].time)} · {t('player.loopDuration', { value: loopTargets[hoverTarget].length.toFixed(1) })}
            </span>
            {loopTargets[hoverTarget].text && <span className="ml-2">{loopTargets[hoverTarget].text}</span>}
          </div>
        )}

        {/* The loop start, waiting for its end */}
        {isReady && loopDraft != null && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 z-30 w-1 -translate-x-1/2 rounded-pill bg-accent-purple"
              style={{ left: `${(loopDraft / duration) * 100}%` }}
            />
            <div
              role="status"
              className="pointer-events-none absolute bottom-1 z-30 -translate-x-1/2 whitespace-nowrap rounded-xs bg-accent-purple px-2 py-0.5 text-[11px] font-semibold text-background"
              style={{ left: `clamp(8rem, ${(loopDraft / duration) * 100}%, calc(100% - 8rem))` }}
            >
              {t('player.loopPickEnd')}
            </div>
          </>
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
            <div className="w-1 h-6 bg-violet-400 rounded-pill group-hover:bg-violet-300 transition-colors shadow-[0_0_6px_rgba(139,92,246,0.8)]" />
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
            <div className="w-1 h-6 bg-violet-400 rounded-pill group-hover:bg-violet-300 transition-colors shadow-[0_0_6px_rgba(139,92,246,0.8)]" />
          </div>
        )}

        {presence && isReady && <RemotePlayheads duration={duration} onSeek={onSeek} />}

        {/* Playback line */}
        {isReady && (
          <div
            className="absolute top-0 bottom-0 w-0.5 -translate-x-1/2 pointer-events-none z-30"
            style={{ left: `${playbackPct}%`, background: 'var(--color-primary)', boxShadow: '0 0 8px var(--color-primary)' }}
          />
        )}
      </div>

      {/* Ruler with labelled ticks. Below lg the labels run into each other (a long song puts
          ten of them across a phone), and the player shows the clock underneath anyway. */}
      {isReady && duration > 0 && (
        <div className="w-full h-5 relative select-none max-lg:hidden">
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
