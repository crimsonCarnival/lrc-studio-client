import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { useSettings } from '@/features/settings/useSettings';
import { usePlayer } from '@/features/player/PlayerContext';
import { formatClock } from '../subtitle-clock';
import type { Cue } from '../subtitles.types';

type PlayerBarProps = {
  cues: Cue[];
  full: boolean;
  onToggleFull: () => void;
};

const ROUND = 'size-11 shrink-0 rounded-full border-zinc-700 bg-transparent';
const SQUARE = 'size-11 shrink-0 rounded-[calc(var(--radius)*1)] border-zinc-700 bg-transparent';

/**
 * This app's own player controls: previous / play / next subtitle, scrubber, clock, speed,
 * volume and fullscreen. Previous and next step by subtitle start; a press just after a
 * subtitle starts goes back to its start first. Reads the player itself, so the studio
 * shell does not re-render on every playback tick.
 */
export function PlayerBar({ cues, full, onToggleFull }: PlayerBarProps) {
  const { t } = useTranslation();
  const tx = t as (key: string, options?: Record<string, unknown>) => string;
  const { settings, updateSetting } = useSettings();
  const { isPlaying, currentTime, duration, hasMedia, playbackSpeed, speedPresets, togglePlay, seek, applySpeed } = usePlayer();
  const muted = !!settings.playback?.muted;
  const volume = settings.playback?.volume ?? 1;

  const goPrevious = () => {
    const before = cues.filter((c) => c.start < currentTime - 0.3);
    seek(before.length ? before[before.length - 1].start : 0);
  };
  const goNext = () => {
    const next = cues.find((c) => c.start > currentTime + 0.05);
    if (next) seek(next.start);
  };
  const cycleSpeed = () => {
    const i = speedPresets.findIndex((s) => s >= playbackSpeed - 0.001);
    applySpeed(speedPresets[(i + 1) % speedPresets.length] ?? 1);
  };

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon" onClick={goPrevious} disabled={!hasMedia} aria-label={tx('editor.studio.previous')} className={ROUND}>
        <Icon name="skip_previous" size={18} />
      </Button>
      <Button size="icon" onClick={togglePlay} disabled={!hasMedia} aria-label={t('shortcuts.playPause')} className="size-12 shrink-0 rounded-full bg-primary text-zinc-950 hover:bg-primary-dim">
        <Icon name={isPlaying ? 'pause' : 'play_arrow'} size={20} />
      </Button>
      <Button variant="outline" size="icon" onClick={goNext} disabled={!hasMedia} aria-label={tx('editor.studio.next')} className={ROUND}>
        <Icon name="skip_next" size={18} />
      </Button>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.01}
        value={currentTime}
        disabled={!hasMedia}
        aria-label={t('player.seekPlayback')}
        onChange={(e) => seek(parseFloat(e.target.value))}
        className="h-1.5 min-w-0 flex-1 accent-primary"
      />
      <span className="shrink-0 font-mono text-[13px] tabular-nums text-foreground">
        {formatClock(currentTime)} <span className="text-foreground/65">/ {formatClock(duration)}</span>
      </span>
      <Button
        variant="outline"
        onClick={cycleSpeed}
        disabled={!hasMedia}
        aria-label={tx('editor.studio.speed', { speed: playbackSpeed })}
        className="h-11 shrink-0 rounded-[calc(var(--radius)*1)] border-zinc-700 bg-transparent px-3 font-mono text-[13px] font-medium text-foreground"
      >
        {playbackSpeed}×
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => updateSetting('playback.muted', !muted)}
        aria-label={muted ? tx('editor.studio.unmute') : tx('editor.studio.mute')}
        aria-pressed={muted}
        className={SQUARE}
      >
        <Icon name={muted || volume === 0 ? 'volume_off' : 'volume_up'} size={18} />
      </Button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={muted ? 0 : volume}
        aria-label={tx('editor.studio.volume')}
        onChange={(e) => {
          const next = parseFloat(e.target.value);
          updateSetting('playback.volume', next);
          if (muted && next > 0) updateSetting('playback.muted', false);
        }}
        className="h-1.5 w-20 shrink-0 accent-primary"
      />
      <Button variant="outline" size="icon" onClick={onToggleFull} aria-label={full ? tx('editor.studio.exitFullscreen') : tx('editor.studio.fullscreen')} aria-pressed={full} className={SQUARE}>
        {/* Not in the app's icon set, so drawn here. */}
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {full
            ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
            : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
        </svg>
      </Button>
    </div>
  );
}
