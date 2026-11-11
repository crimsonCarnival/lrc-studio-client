import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { usePlayer } from '@/features/player/PlayerContext';
import { activeCues } from '../subtitle-cues';
import { formatClock } from '../subtitle-clock';
import type { Cue } from '../subtitles.types';

type VideoStageProps = {
  cues: Cue[];
  full: boolean;
  onToggleFull: () => void;
  onChooseMedia: () => void;
  /** The controls drawn over the picture while fullscreen. */
  controls: ReactNode;
};

// How long the fullscreen controls stay up after the pointer last moved.
const CONTROLS_HIDE_MS = 2500;
// The picture sits at PICTURE_Z, this app's layer on it one above. Both are above the page's
// content and below its dialogs; fullscreen goes higher so it covers the header too.
const PICTURE_Z = 30;
const FULL_PICTURE_Z = 59;

type Box = { top: number; left: number; width: number; height: number };

/** The on-screen box of `el`, kept current as it resizes or the page scrolls. */
function useBox(el: HTMLElement | null): Box | null {
  const [box, setBox] = useState<Box | null>(null);
  useEffect(() => {
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBox((prev) => (prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height ? prev : { top: r.top, left: r.left, width: r.width, height: r.height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [el]);
  return el ? box : null;
}

/**
 * This app's own video player surface. For a YouTube source the player's iframe is laid
 * over a placeholder here with YouTube's controls and captions off, and this component draws
 * a layer on top that takes every click (click to play, double click for fullscreen) and
 * shows the subtitles. Any other source has no picture, so the subtitles show over a blank
 * stage. Fullscreen covers the whole viewport.
 */
export function VideoStage({ cues, full, onToggleFull, onChooseMedia, controls }: VideoStageProps) {
  const { t } = useTranslation();
  const tx = t as (key: string, options?: Record<string, unknown>) => string;
  const { currentTime, source, hasMedia, isPlaying, togglePlay, registerVideoStage, local } = usePlayer();
  const [placeholder, setPlaceholder] = useState<HTMLDivElement | null>(null);
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  const box = useBox(placeholder);
  const [started, setStarted] = useState(false);
  const [controlsUp, setControlsUp] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fullscreen puts the picture under a layer that covers the viewport; otherwise under one
  // that tracks the placeholder.
  const target = full ? layer : placeholder;
  const z = full ? FULL_PICTURE_Z : PICTURE_Z;
  useEffect(() => {
    registerVideoStage(target, z);
    return () => registerVideoStage(null);
  }, [target, z, registerVideoStage]);

  // Adjusted while rendering (React's pattern for state that follows other state), not in an effect.
  if (isPlaying && !started) setStarted(true);
  if (!hasMedia && started) setStarted(false);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);
  const wake = () => {
    setControlsUp(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsUp(false), CONTROLS_HIDE_MS);
  };

  const showing = useMemo(() => activeCues(cues, currentTime), [cues, currentTime]);
  // A YouTube video, or a video file picked in this session. Stored copies are audio only.
  const hasPicture = !!hasMedia && (source === 'youtube' || (source === 'local' && !!local.isVideo));
  const first = showing[0];
  const barVisible = full && (controlsUp || !isPlaying);

  const layerStyle: CSSProperties = full
    ? { position: 'fixed', inset: 0, zIndex: z + 1, containerType: 'inline-size' }
    : box
      ? { position: 'fixed', top: box.top, left: box.left, width: box.width, height: box.height, zIndex: z + 1, containerType: 'inline-size' }
      : { display: 'none' };

  const layerNode = (
    <div
      ref={setLayer}
      onPointerMove={full ? wake : undefined}
      className={`overflow-hidden ${full ? '' : 'rounded-[14px]'}`}
      style={layerStyle}
    >
      {!hasPicture && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm leading-snug text-white/55">
          <Icon name={hasMedia ? 'music_note' : 'smart_display'} size={32} />
          {hasMedia ? t('editor.studio.audioOnly') : t('editor.studio.noMedia')}
          {!hasMedia && (
            <Button variant="outline" onClick={onChooseMedia} className="relative z-10 h-11 rounded-[calc(var(--radius)*1)] border-zinc-700 bg-transparent px-3.5 text-xs font-semibold text-foreground">
              {t('editor.studio.chooseMedia')}
            </Button>
          )}
        </div>
      )}

      {/* Before the first play the iframe shows YouTube's own title bar and play button: cover them. */}
      {source === 'youtube' && hasPicture && !started && <div aria-hidden className="absolute inset-0 bg-black" />}

      {/* Takes every click, so YouTube's own click handling and hover chrome never see the pointer. */}
      {hasMedia && (
        <button
          type="button"
          aria-label={t('shortcuts.playPause')}
          onClick={togglePlay}
          onDoubleClick={onToggleFull}
          className="absolute inset-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
        />
      )}
      {hasMedia && !isPlaying && (
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 grid size-[72px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white">
          <Icon name="play_arrow" size={34} />
        </span>
      )}

      {first && (
        <span className="pointer-events-none absolute right-3 top-3 rounded-md bg-background/85 px-2 py-1 font-mono text-[11px] text-foreground">
          {tx('editor.studio.stageCue', { n: cues.indexOf(first) + 1, start: formatClock(first.start), end: formatClock(first.end) })}
        </span>
      )}
      <div aria-live="off" className={`pointer-events-none absolute inset-x-0 flex flex-col items-center gap-1 px-[4%] ${barVisible ? 'bottom-[18%]' : 'bottom-[12%]'}`}>
        {showing.map((cue) => (
          <span
            key={cue.lineIndex}
            className="max-w-full rounded-sm bg-black/80 px-[0.45em] py-[0.12em] text-center text-white whitespace-pre-line leading-snug"
            style={{ fontSize: 'clamp(12px, 3.2cqw, 40px)' }}
          >
            {cue.text}
          </span>
        ))}
      </div>

      {full && barVisible && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-6 pb-5 pt-12">{controls}</div>
      )}
    </div>
  );

  // Sized from the box it is given, so the stage keeps 16:9 whichever side runs out first. The
  // placeholder only reserves the space (and the backdrop for a source with no picture); the
  // layer that does the work is drawn into the body, over the picture.
  return (
    <div className="flex min-h-0 w-full flex-1 items-center justify-center" style={{ containerType: 'size' }}>
      <div
        ref={setPlaceholder}
        className={`rounded-[14px] ${hasPicture ? 'bg-transparent' : 'bg-black'} ${hasMedia ? 'border border-zinc-800' : 'border border-dashed border-zinc-600'}`}
        style={{ width: 'min(100cqw, calc(100cqh * 16 / 9))', aspectRatio: '16 / 9' }}
      />
      {createPortal(layerNode, document.body)}
    </div>
  );
}
