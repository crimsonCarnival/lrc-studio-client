import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/shared/ui/Icon';
import { Tip } from '@ui/tip';
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover';
import { cn } from '@/shared/utils/utils';
import { easeKaraokeFill, karaokeClipStyle, karaokeFillGlowClass, karaokeFillPrefs, type KaraokeFillEasing, type KaraokeFillStyle } from '@/shared/utils/karaoke-clip';
import { useSettings } from '@/features/settings/useSettings';
import { sessionPublicIdFromPath } from '@/features/projects/project-path';
import { usePlayer } from '../PlayerContext';
import { karaokeWords, lineAt, lineBoundsAt, lyricAfter, lyricAt, nextLineStart, previousLineStart, type MiniPlayerPosition, type MiniPlayerSettings } from '../mini-player';
import { useCornerDrag, useMediaSession, useMiniPlayerShortcuts } from '../hooks/useMiniPlayerControls';
import { MiniPlayerSessionMembers } from './MiniPlayerSessionMembers';
import SpeedControl from './SpeedControl';
import type { EditorLine } from '@/features/editor/editor.types';

type Props = {
  /** The page this player leads back to: the editor, or the public project view it came from. */
  returnTo: string;
  title: string;
  artist?: string;
  settings: MiniPlayerSettings;
  /** The phone tab bar is showing: the bottom corners sit above it. */
  aboveNav: boolean;
  onClose: () => void;
  /** A drag let go nearer another corner. */
  onPositionChange: (position: MiniPlayerPosition) => void;
};

type View = 'card' | 'lyrics' | 'bubble';

// The engine draws a video's picture over the stage element at this z-index, so it must sit
// above the card (z-45) or the card's own background would cover it. The picture takes no
// pointer events; clicks fall through to the card.
const CARD_Z = 45;
const PICTURE_Z = CARD_Z + 1;

const CORNER: Record<MiniPlayerPosition, string> = {
  'bottom-right': 'right-4 bottom-4',
  'bottom-left': 'left-4 bottom-4',
  'top-right': 'right-4 top-[4.5rem]',
  'top-left': 'left-4 top-[4.5rem]',
};

const BUTTON = 'grid size-9 shrink-0 place-items-center rounded-pill text-subtle transition-colors hover:bg-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus coarse:size-11 disabled:opacity-40 disabled:hover:bg-transparent';

// m:ss. The editor's centiseconds are noise at a glance.
const clock = (s: number) => {
  const total = Number.isFinite(s) && s > 0 ? Math.floor(s) : 0;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * The project, still playing, after leaving the page that plays it: a small card in a corner
 * with the picture or cover, the song, the line being sung and the transport. It can open the
 * whole lyrics (tap a line to jump there), loop the line, shrink to a bubble, be dragged to
 * another corner (or flung off a phone screen), and answers the player keys and the OS media
 * controls. The card leads back to where it came from; closing it stops playback.
 */
export function MiniPlayer({ returnTo, title, artist, settings, aboveNav, onClose, onPositionChange }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings: appSettings } = useSettings();
  const fillPrefs = karaokeFillPrefs(appSettings.editor?.display);
  const {
    isPlaying, togglePlay, seek, currentTime, duration, source, local, lines, hasMedia,
    registerVideoStage, projectCoverImage, thumbnail, loopA, loopB, setLoop, clearLoop,
    playbackSpeed, applySpeed, speedPresets, MIN_SPEED, MAX_SPEED,
  } = usePlayer();
  const [view, setView] = useState<View>('card');
  const pictureRef = useRef<HTMLDivElement>(null);
  const hasPicture = source === 'youtube' || (source === 'local' && !!local?.isVideo);
  const showPicture = hasPicture && view !== 'bubble';

  useEffect(() => {
    if (!showPicture || !pictureRef.current) return;
    registerVideoStage(pictureRef.current, PICTURE_Z);
    return () => registerVideoStage(null);
  }, [showPicture, registerVideoStage]);

  const timedLines = (lines ?? []).filter((l) => l.type !== 'section' && l.timestamp != null && !!l.text?.trim());
  const hasLyrics = timedLines.length > 0;
  const lyric = lyricAt(lines, currentTime);
  const sungLine = lineAt(lines, currentTime);
  const upcoming = lyricAfter(lines, currentTime);
  const prev = previousLineStart(lines, currentTime);
  const next = nextLineStart(lines, currentTime);
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const cover = projectCoverImage || thumbnail || null;
  const looping = loopA != null && loopB != null;
  const open = () => navigate(returnTo);

  const toggleLoop = () => {
    if (looping) { clearLoop(); return; }
    const span = lineBoundsAt(lines, currentTime, duration);
    if (span) setLoop(span);
  };
  const toPrevious = () => { if (prev != null) seek(prev); };
  const toNext = () => { if (next != null) seek(next); };

  useMiniPlayerShortcuts(appSettings.shortcuts as Record<string, string[]> | undefined, appSettings.playback?.seekTime ?? 5, {
    togglePlay,
    seekBy: (delta) => seek(Math.max(0, currentTime + delta)),
    previousLine: toPrevious,
    nextLine: toNext,
    toggleLoop,
  });
  useMediaSession({ title: title || t('library.untitled'), artist, artwork: cover, isPlaying, currentTime, duration }, {
    play: () => { if (!isPlaying) togglePlay(); },
    pause: () => { if (isPlaying) togglePlay(); },
    seekTo: seek,
    previousLine: toPrevious,
    nextLine: toNext,
  });

  const isPhone = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;
  const drag = useCornerDrag({ onCorner: onPositionChange, onSwipeAway: onClose, swipeEnabled: isPhone });

  // Nothing loaded (a project without media, or the media was removed): nothing to carry.
  if (!hasMedia) return null;
  const bottom = settings.position.startsWith('bottom');
  const placement = cn(
    'fixed',
    CORNER[settings.position],
    bottom && aboveNav && 'max-lg:bottom-[calc(5rem+env(safe-area-inset-bottom))]',
    drag.dragging ? 'cursor-grabbing transition-none' : 'transition-transform duration-200',
  );
  const sessionId = sessionPublicIdFromPath(returnTo);

  if (view === 'bubble') {
    // A ring around the cover shows the progress; r=30 in a 64 box.
    const circumference = 2 * Math.PI * 30;
    return (
      <div style={{ zIndex: CARD_Z, ...drag.style }} {...drag.handlers} className={cn(placement, 'touch-none animate-in fade-in zoom-in-90 duration-200')}>
        <button
          type="button"
          onClick={() => setView('card')}
          aria-label={t('player.mini.restore', { title })}
          className="relative grid size-16 place-items-center rounded-full bg-raised shadow-toast focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus"
        >
          <span className="absolute inset-1.5 overflow-hidden rounded-full bg-black">
            {cover ? <img src={cover} alt="" className="size-full object-cover" /> : <Icon name="music_note" size={22} className="absolute inset-0 m-auto text-subtle" />}
          </span>
          <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle cx="32" cy="32" r="30" fill="none" strokeWidth="3" className="stroke-hl" />
            <circle cx="32" cy="32" r="30" fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-primary transition-[stroke-dashoffset] duration-300 ease-linear"
              strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress / 100)} />
          </svg>
          {isPlaying && <span className="absolute right-0.5 bottom-0.5 size-3.5 rounded-full bg-primary ring-2 ring-raised" aria-hidden="true" />}
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label={t('player.mini.label')}
      style={{ zIndex: CARD_Z, ...drag.style }}
      {...drag.handlers}
      className={cn(
        placement,
        'w-[min(22rem,calc(100vw-2rem))] touch-none overflow-hidden rounded-[var(--radius-card)] bg-raised shadow-toast inset-ring inset-ring-hl animate-in fade-in duration-300',
        bottom ? 'slide-in-from-bottom-4' : 'slide-in-from-top-4',
      )}
    >
      <div className="flex cursor-grab items-center gap-3 p-2 pr-1 active:cursor-grabbing">
        <button
          type="button"
          onClick={open}
          aria-label={t('player.mini.backTo', { title })}
          className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-[calc(var(--radius)*1)] bg-black focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus"
        >
          {showPicture ? (
            <div ref={pictureRef} className="absolute inset-0" />
          ) : cover ? (
            <img src={cover} alt="" className="absolute inset-0 size-full object-cover" draggable={false} />
          ) : (
            <Icon name="music_note" size={24} className="absolute inset-0 m-auto text-subtle" />
          )}
        </button>

        <button type="button" onClick={open} className="flex min-w-0 flex-1 flex-col items-start text-left focus-visible:outline-none">
          <span className="w-full truncate text-sm font-semibold text-foreground">{title || t('library.untitled')}</span>
          <span className="font-mono text-xs tabular-nums text-subtle">{clock(currentTime)} / {clock(duration)}</span>
        </button>

        <div className="flex shrink-0 items-center self-start">
          <Tip content={t('player.mini.minimize')}>
            <button type="button" onClick={() => setView('bubble')} aria-label={t('player.mini.minimize')} className={cn(BUTTON, 'size-8')}>
              <Icon name="close_fullscreen" size={16} />
            </button>
          </Tip>
          <Tip content={t('player.mini.open')}>
            <button type="button" onClick={open} aria-label={t('player.mini.open')} className={cn(BUTTON, 'size-8')}>
              <Icon name="open_in_full" size={16} />
            </button>
          </Tip>
          <Tip content={t('player.mini.close')}>
            <button type="button" onClick={onClose} aria-label={t('player.mini.close')} className={cn(BUTTON, 'size-8')}>
              <Icon name="close" size={16} />
            </button>
          </Tip>
        </div>
      </div>

      {view === 'lyrics' && hasLyrics ? (
        <LyricsList lines={timedLines} current={lyric} onSeek={seek} label={t('player.mini.lyrics')} currentTime={currentTime} prefs={fillPrefs} />
      ) : settings.lyrics && hasLyrics && (
        // The lyric is the point of the card, so it gets its own block at reading size. Two lines
        // tall whatever is showing, so the card does not jump as lines change. Opens the lyrics.
        <button type="button" onClick={() => setView('lyrics')} aria-label={t('player.mini.showLyrics')} className="flex w-full flex-col gap-0.5 px-3 pt-1 pb-1 text-left focus-visible:outline-none">
          <span className="line-clamp-2 min-h-[2lh] font-heading text-lg leading-snug font-semibold text-foreground" aria-live="off">
            {sungLine ? <KaraokeText line={sungLine} time={currentTime} prefs={fillPrefs} /> : <span className="text-subtle">♪</span>}
          </span>
          <span className="truncate text-sm text-subtle">{upcoming ?? ' '}</span>
        </button>
      )}

      <div className="flex items-center justify-center gap-1 px-2 pb-2">
        <Tip content={looping ? t('player.mini.stopLoop') : t('player.mini.loopLine')}>
          <button type="button" disabled={!hasLyrics && !looping} onClick={toggleLoop} aria-pressed={looping} aria-label={t('player.mini.loopLine')} className={cn(BUTTON, looping && 'bg-primary-soft text-primary-ink hover:bg-primary-soft hover:text-primary-ink')}>
            <Icon name="repeat" size={18} />
          </button>
        </Tip>
        <Tip content={t('player.mini.previousLine')}>
          <button type="button" disabled={prev == null} onClick={toPrevious} aria-label={t('player.mini.previousLine')} className={BUTTON}>
            <Icon name="skip_previous" size={20} />
          </button>
        </Tip>
        <Tip content={isPlaying ? t('player.mini.pause') : t('player.mini.play')}>
          <button type="button" onClick={togglePlay} aria-label={isPlaying ? t('player.mini.pause') : t('player.mini.play')} className={cn(BUTTON, 'size-10 bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground hover:brightness-110')}>
            <Icon name={isPlaying ? 'pause' : 'play_arrow'} size={22} />
          </button>
        </Tip>
        <Tip content={t('player.mini.nextLine')}>
          <button type="button" disabled={next == null} onClick={toNext} aria-label={t('player.mini.nextLine')} className={BUTTON}>
            <Icon name="skip_next" size={20} />
          </button>
        </Tip>
        <Tip content={view === 'lyrics' ? t('player.mini.hideLyrics') : t('player.mini.showLyrics')}>
          <button type="button" disabled={!hasLyrics} onClick={() => setView(view === 'lyrics' ? 'card' : 'lyrics')} aria-pressed={view === 'lyrics'} aria-label={t('player.mini.showLyrics')} className={cn(BUTTON, view === 'lyrics' && 'bg-primary-soft text-primary-ink hover:bg-primary-soft hover:text-primary-ink')}>
            <Icon name="lyrics" size={18} />
          </button>
        </Tip>
        {/* The speed the card plays at belongs to whichever player it carries (the editor's,
            or the one handed over from a public view), so it is set here, not only there.
            The pill opens the full control, as on the phone strip: the row has no room for it. */}
        <Popover>
          <Tip content={t('player.speed')}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`${t('player.speed')}: ${playbackSpeed}×`}
                className={cn(BUTTON, 'w-auto min-w-11 px-2 font-mono text-xs font-semibold tabular-nums', playbackSpeed !== 1 && 'text-primary-ink')}
              >
                {playbackSpeed}×
              </button>
            </PopoverTrigger>
          </Tip>
          {/* Portalled, but React still bubbles its pointer events up to the card: without
              data-no-drag, selecting the custom speed's text would drag the card away. */}
          <PopoverContent side="top" align="end" className="w-auto p-2" data-no-drag>
            <SpeedControl
              playbackSpeed={playbackSpeed}
              applySpeed={applySpeed}
              MIN_SPEED={MIN_SPEED}
              MAX_SPEED={MAX_SPEED}
              SPEED_PRESETS={speedPresets}
            />
          </PopoverContent>
        </Popover>
      </div>

      {sessionId && <MiniPlayerSessionMembers publicId={sessionId} />}

      <div className="h-1 bg-hl" role="progressbar" aria-label={t('player.mini.progress')} aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(currentTime)}>
        <div className="h-full bg-primary transition-[width] duration-300 ease-linear" style={{ width: `${progress}%` }} />
      </div>
    </section>
  );
}

type TimedLine = { id?: string; text?: string; timestamp?: number | null };

/** Every timed line, the one being sung lit and kept in view. A tap jumps to that line. */
function LyricsList({ lines, current, onSeek, label, currentTime, prefs }: { lines: TimedLine[]; current: string | null; onSeek: (t: number) => void; label: string; currentTime: number; prefs: FillPrefs }) {
  const listRef = useRef<HTMLOListElement>(null);
  // The playing line: the last whose start has passed. Matched by index, not text (choruses repeat).
  let active = -1;
  lines.forEach((l, i) => { if ((l.timestamp as number) <= currentTime) active = i; });
  if (current == null) active = -1;

  useEffect(() => {
    const list = listRef.current;
    const item = active >= 0 ? list?.children[active] as HTMLElement | undefined : undefined;
    if (!list || !item) return;
    list.scrollTo?.({ top: item.offsetTop - list.clientHeight / 2 + item.clientHeight / 2, behavior: 'smooth' });
  }, [active]);

  return (
    <ol ref={listRef} aria-label={label} data-no-drag className="relative max-h-64 touch-pan-y overflow-y-auto overscroll-contain px-2 py-2 [mask-image:linear-gradient(to_bottom,transparent,black_16px,black_calc(100%-24px),transparent)]">
      {lines.map((l, i) => (
        <li key={l.id ?? i}>
          <button
            type="button"
            onClick={() => onSeek(l.timestamp as number)}
            aria-current={i === active ? 'true' : undefined}
            className={cn(
              'w-full rounded-[calc(var(--radius)*1)] px-2 py-1.5 text-left font-heading leading-snug transition-colors hover:bg-hl focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus',
              i === active ? 'text-lg font-semibold text-foreground' : 'text-base text-subtle',
            )}
          >
            {i === active ? <KaraokeText line={l as EditorLine} time={currentTime} prefs={prefs} /> : l.text}
          </button>
        </li>
      ))}
    </ol>
  );
}

/**
 * The line being sung, its words filling in as they are sung, as in the preview. Plain text
 * when the line has no word times: a fill is never guessed from the text.
 */
type FillPrefs = { style: KaraokeFillStyle; easing: KaraokeFillEasing };

function KaraokeText({ line, time, prefs }: { line: EditorLine; time: number; prefs: FillPrefs }) {
  const words = karaokeWords(line, time);
  if (!words) return <>{line.text}</>;
  return (
    <>
      <span className="sr-only">{line.text}</span>
      <span aria-hidden="true">
      {words.map((w, i) => (
        <span key={i}>
          <span className="relative inline-block">
            <span className="text-foreground/50">{w.text}</span>
            {w.fill > 0 && (
              <span
                className={cn('pointer-events-none absolute inset-0 whitespace-nowrap text-primary-ink', karaokeFillGlowClass(prefs.style))} data-karaoke-fill
                style={karaokeClipStyle(easeKaraokeFill(w.fill, prefs.easing))}
              >
                {w.text}
              </span>
            )}
          </span>
          {w.spaceAfter ? ' ' : null}
        </span>
      ))}
      </span>
    </>
  );
}
