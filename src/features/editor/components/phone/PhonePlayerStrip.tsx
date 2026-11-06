import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover';
import { usePlayer } from '@/features/player/PlayerContext';
import SpeedControl from '@/features/player/components/SpeedControl';
import { lineLoopAt } from '@/features/player/line-loop';
import { useSettings } from '@/features/settings/useSettings';
import { formatTime } from '@/shared/utils/format-time';

type PhonePlayerStripProps = {
  /** Opens the change-media dialog; shown in place of the controls while nothing is loaded. */
  onAddMedia?: () => void;
};

const STRIP_BTN = 'size-11 lg:size-11 shrink-0 rounded-[calc(var(--radius)*1)] text-foreground/75 hover:text-foreground';

/**
 * The phone editor's one-row player: play/pause, current time, back N seconds, line loop
 * and speed, plus a thin seek bar along its top edge. It is only controls: the media
 * elements live in PlayerEngine, which stays mounted above the routes.
 */
export default function PhonePlayerStrip({ onAddMedia }: PhonePlayerStripProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const {
    hasMedia, isPlaying, currentTime, duration, playbackSpeed, loopA, loopB, lines, viewerMode,
    togglePlay, seek, applySpeed, setLoop, clearLoop, MIN_SPEED, MAX_SPEED, speedPresets,
  } = usePlayer();
  const seekStep = settings.playback?.seekTime ?? 5;
  const looping = loopA != null && loopB != null;
  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  if (!hasMedia) {
    return (
      <div className="px-4 py-2">
        <Button
          variant="outline"
          onClick={onAddMedia}
          disabled={!onAddMedia || viewerMode}
          className="w-full h-11 gap-2 rounded-[calc(var(--radius)*1)] border-zinc-800 bg-transparent text-[15px] font-semibold text-foreground"
        >
          <Icon name="music_note" size={18} />
          {t('player.addMedia')}
        </Button>
      </div>
    );
  }

  const toggleLoop = () => {
    if (looping) { clearLoop(); return; }
    const bounds = lineLoopAt(lines ?? [], currentTime, duration);
    if (bounds) setLoop(bounds);
  };

  return (
    <div className="relative px-2 pt-3 pb-1">
      {/* Thin progress line; the transparent range over it is the touch target for seeking. */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-zinc-800">
        <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={currentTime}
        aria-label={t('player.seekPlayback')}
        onChange={(e) => seek(parseFloat(e.target.value))}
        className="absolute inset-x-0 top-0 h-3 w-full cursor-pointer opacity-0 touch-manipulation"
      />
      <div className="flex items-center gap-1.5">
        <Button
          size="icon"
          onClick={togglePlay}
          aria-label={t('shortcuts.playPause')}
          className="size-11 lg:size-11 shrink-0 rounded-pill bg-primary hover:bg-primary-dim text-zinc-950"
        >
          <Icon name={isPlaying ? 'pause' : 'play_arrow'} size={20} />
        </Button>
        <span className="min-w-0 flex-1 truncate px-1 font-mono text-[13px] tabular-nums text-foreground/80">
          {formatTime(currentTime)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => seek(Math.max(0, currentTime - seekStep))}
          aria-label={t('player.seekBack', { seconds: seekStep })}
          className={`${STRIP_BTN} flex-col gap-0`}
        >
          <Icon name="skip_previous" size={18} />
          <span className="text-[10px] font-bold leading-none">{seekStep}</span>
        </Button>
        {!viewerMode && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLoop}
            aria-pressed={looping}
            aria-label={looping ? t('player.clearLoop') : t('player.loop')}
            className={`${STRIP_BTN} ${looping ? 'bg-primary/15 text-primary hover:text-primary' : ''}`}
          >
            <Icon name="repeat" size={20} />
          </Button>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              aria-label={t('player.speed')}
              className="h-11 lg:h-11 min-w-12 shrink-0 rounded-[calc(var(--radius)*1)] px-2 font-mono text-[13px] font-semibold text-foreground/80"
            >
              {`${playbackSpeed}×`}
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-auto p-2">
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
    </div>
  );
}
