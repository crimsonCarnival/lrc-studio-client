import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/features/settings/useSettings';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { Tip } from '@ui/tip';

const VolumeControl = memo(function VolumeControl() {
  const { t } = useTranslation();
  const { settings, updateSetting } = useSettings();

  return (
    <div className="flex items-center gap-1.5 lg:gap-2" role="group" aria-label={t('player.volume') || 'Volume'}>
      <Tip content={settings.playback.muted ? t('player.unmute') || 'Unmute' : t('player.mute') || 'Mute'}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => updateSetting('playback.muted', !settings.playback.muted)}
          className="rounded-full bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 flex-shrink-0 size-11 lg:size-9 active:scale-95 transition-all duration-100"
          aria-label={settings.playback.muted ? t('player.unmute') || 'Unmute' : t('player.mute') || 'Mute'}
        >
        {settings.playback.muted || settings.playback.volume === 0 ? (
          <Icon name="volume_off" size={20} className="lg:size-4" />
        ) : (
          <Icon name="volume_up" size={20} className="lg:size-4" />
        )}
        </Button>
      </Tip>

      {/* Desktop Slider */}
      <div className="hidden lg:flex items-center w-24">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={settings.playback.volume ?? 0}
          aria-label={t('player.volume') || 'Volume'}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            updateSetting('playback.volume', val);
            if (val > 0 && settings.playback.muted) updateSetting('playback.muted', false);
          }}
          className="w-full"
          style={{
            background: `linear-gradient(to right, var(--color-primary) ${settings.playback.volume * 100}%, rgba(255, 255, 255, 0.15) ${settings.playback.volume * 100}%)`
          }}
        />
      </div>

      {/* Mobile Controls */}
      <div className="lg:hidden flex items-center gap-1">
        <Tip content={t('player.decreaseVolume')}>
          <button
            onClick={() => updateSetting('playback.volume', Math.max(0, settings.playback.volume - 0.1))}
            className="size-11 rounded-full bg-zinc-800/60 flex items-center justify-center text-zinc-500 active:bg-zinc-700 active:text-zinc-200 active:scale-95 transition-all duration-100"
            aria-label={t('player.decreaseVolume')}
          >
            <Icon name="remove" size={20} className="lg:size-4" />
          </button>
        </Tip>
        <Tip content={t('player.increaseVolume')}>
          <button
            onClick={() => updateSetting('playback.volume', Math.min(1, settings.playback.volume + 0.1))}
            className="size-11 rounded-full bg-zinc-800/60 flex items-center justify-center text-zinc-500 active:bg-zinc-700 active:text-zinc-200 active:scale-95 transition-all duration-100"
            aria-label={t('player.increaseVolume')}
          >
            <Icon name="add" size={20} className="lg:size-4" />
          </button>
        </Tip>
      </div>
    </div>
  );
});

export default VolumeControl;
