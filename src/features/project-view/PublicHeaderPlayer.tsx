import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayer } from '@features/player/PlayerContext';
import { Icon } from '@/shared/ui/Icon';
import { Tip } from '@ui/tip';
import { Button } from '@ui/button';

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface PublicHeaderPlayerProps {
  playerHidden: boolean;
  onTogglePlayer: () => void;
  hasInitialMedia: boolean;
}

export function PublicHeaderPlayer({
  playerHidden,
  onTogglePlayer,
  hasInitialMedia,
}: PublicHeaderPlayerProps) {
  const { t } = useTranslation();
  const {
    isPlaying,
    currentTime,
    duration,
    hasMedia,
    isSeeking,
    togglePlay,
    seek,
  } = usePlayer();

  const ready = !!hasMedia;
  if (!hasMedia && !hasInitialMedia) return null;

  if (!playerHidden) {
    return (
      <Tip content={t('projectView.hidePlayer')}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onTogglePlayer}
          aria-label={t('projectView.hidePlayer')}
          className="size-10 lg:size-10 coarse:size-11 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
        >
          <Icon name="expand_more" size={20} />
        </Button>
      </Tip>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-md shadow-sm"
      role="region"
      aria-label={t('player.title')}
    >
      <button
        type="button"
        onClick={togglePlay}
        disabled={!ready}
        aria-label={isSeeking ? t('player.loading') : isPlaying ? t('projectView.pause') : t('projectView.play')}
        className="size-7 sm:size-8 rounded-full bg-primary text-zinc-950 flex items-center justify-center hover:opacity-90 active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none shadow-sm shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        {isSeeking ? (
          <span
            className="eq-bars text-zinc-950"
            style={{ '--eq-h': '12px', '--eq-w': '2px', '--eq-gap': '1.5px' } as CSSProperties}
            aria-hidden
          >
            <i /><i /><i />
          </span>
        ) : (
          <Icon name={isPlaying ? 'pause' : 'play_arrow'} size={15} filled />
        )}
      </button>

      {/* Mini scrubber on md+ screens */}
      {duration > 0 && (
        <div className="hidden md:flex w-20 lg:w-28 items-center">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            aria-label={t('player.seekPlayback')}
            aria-valuenow={Math.round(currentTime)}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="w-full h-1 appearance-none rounded-full outline-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--color-primary) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255,255,255,0.1) ${duration ? (currentTime / duration) * 100 : 0}%)`,
            }}
          />
        </div>
      )}

      <span className="font-mono text-[11px] tabular-nums text-zinc-400 whitespace-nowrap">
        {clock(currentTime)}
        <span className="text-zinc-600 hidden sm:inline"> / {clock(duration)}</span>
      </span>

      <Tip content={t('projectView.showPlayer')}>
        <button
          type="button"
          onClick={onTogglePlayer}
          aria-label={t('projectView.showPlayer')}
          className="size-7 sm:size-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <Icon name="expand_less" size={16} />
        </button>
      </Tip>
    </div>
  );
}

