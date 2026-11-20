import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/shared/ui/Icon';
import { Tip } from '@ui/tip';
import { cn } from '@/shared/utils/utils';
import { formatTime } from '@/shared/utils/format-time';
import { usePlayer } from '../PlayerContext';
import { lyricAt, nextLineStart, previousLineStart, type MiniPlayerSettings } from '../mini-player';

type Props = {
  /** The editor page this player leads back to. */
  returnTo: string;
  title: string;
  settings: MiniPlayerSettings;
  /** The phone tab bar is showing: the bottom corners sit above it. */
  aboveNav: boolean;
  onClose: () => void;
};

// The engine draws a video's picture over the stage element at this z-index, so it must sit
// above the card (z-45) or the card's own background would cover it. The picture takes no
// pointer events; clicks fall through to the card.
const CARD_Z = 45;
const PICTURE_Z = CARD_Z + 1;

const CORNER: Record<MiniPlayerSettings['position'], string> = {
  'bottom-right': 'right-4 bottom-4',
  'bottom-left': 'left-4 bottom-4',
  'top-right': 'right-4 top-[4.5rem]',
  'top-left': 'left-4 top-[4.5rem]',
};

const BUTTON = 'grid size-9 shrink-0 place-items-center rounded-pill text-subtle transition-colors hover:bg-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus coarse:size-11';

/**
 * The project, still playing, after leaving its editor: a small card in a corner with the
 * picture or cover, the song, the line being sung and the transport. The card leads back to
 * the editor; closing it stops playback.
 */
export function MiniPlayer({ returnTo, title, settings, aboveNav, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    isPlaying, togglePlay, seek, currentTime, duration, source, local, lines,
    registerVideoStage, projectCoverImage, thumbnail, hasMedia,
  } = usePlayer();
  const pictureRef = useRef<HTMLDivElement>(null);
  const hasPicture = source === 'youtube' || (source === 'local' && !!local?.isVideo);

  useEffect(() => {
    if (!hasPicture || !pictureRef.current) return;
    registerVideoStage(pictureRef.current, PICTURE_Z);
    return () => registerVideoStage(null);
  }, [hasPicture, registerVideoStage]);

  const lyric = settings.lyrics ? lyricAt(lines, currentTime) : null;
  const prev = previousLineStart(lines, currentTime);
  const next = nextLineStart(lines, currentTime);
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const cover = projectCoverImage || thumbnail;
  const open = () => navigate(returnTo);

  // Nothing loaded (a project without media, or the media was removed): nothing to carry.
  if (!hasMedia) return null;
  const bottom = settings.position.startsWith('bottom');
  return (
    <section
      aria-label={t('player.mini.label')}
      style={{ zIndex: CARD_Z }}
      className={cn(
        'fixed w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius-card)] bg-raised shadow-toast inset-ring inset-ring-hl animate-in fade-in duration-300',
        bottom ? 'slide-in-from-bottom-4' : 'slide-in-from-top-4',
        CORNER[settings.position],
        bottom && aboveNav && 'max-lg:bottom-[calc(5rem+env(safe-area-inset-bottom))]',
      )}
    >
      <div className="flex items-center gap-3 p-2 pr-1">
        <button
          type="button"
          onClick={open}
          aria-label={t('player.mini.backTo', { title })}
          className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-[calc(var(--radius)*1)] bg-black focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus"
        >
          {hasPicture ? (
            <div ref={pictureRef} className="absolute inset-0" />
          ) : cover ? (
            <img src={cover} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <Icon name="music_note" size={24} className="absolute inset-0 m-auto text-subtle" />
          )}
        </button>

        <button type="button" onClick={open} className="flex min-w-0 flex-1 flex-col items-start text-left focus-visible:outline-none">
          <span className="w-full truncate text-sm font-semibold text-foreground">{title || t('library.untitled')}</span>
          {lyric ? (
            <span className="w-full truncate text-xs text-subtle" aria-live="off">{lyric}</span>
          ) : (
            <span className="font-mono text-xs tabular-nums text-subtle">{formatTime(currentTime)} / {formatTime(duration)}</span>
          )}
        </button>

        <div className="flex shrink-0 flex-col items-end self-start">
          <div className="flex items-center">
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
      </div>

      <div className="flex items-center justify-center gap-1 px-2 pb-2">
        <Tip content={t('player.mini.previousLine')}>
          <button type="button" disabled={prev == null} onClick={() => prev != null && seek(prev)} aria-label={t('player.mini.previousLine')} className={cn(BUTTON, 'disabled:opacity-40 disabled:hover:bg-transparent')}>
            <Icon name="skip_previous" size={20} />
          </button>
        </Tip>
        <Tip content={isPlaying ? t('player.mini.pause') : t('player.mini.play')}>
          <button type="button" onClick={togglePlay} aria-label={isPlaying ? t('player.mini.pause') : t('player.mini.play')} className={cn(BUTTON, 'size-10 bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground hover:brightness-110')}>
            <Icon name={isPlaying ? 'pause' : 'play_arrow'} size={22} />
          </button>
        </Tip>
        <Tip content={t('player.mini.nextLine')}>
          <button type="button" disabled={next == null} onClick={() => next != null && seek(next)} aria-label={t('player.mini.nextLine')} className={cn(BUTTON, 'disabled:opacity-40 disabled:hover:bg-transparent')}>
            <Icon name="skip_next" size={20} />
          </button>
        </Tip>
      </div>

      <div className="h-1 bg-hl" role="progressbar" aria-label={t('player.mini.progress')} aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(currentTime)}>
        <div className="h-full bg-primary transition-[width] duration-300 ease-linear" style={{ width: `${progress}%` }} />
      </div>
    </section>
  );
}
