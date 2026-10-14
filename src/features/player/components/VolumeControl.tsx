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
    <div className="group/volume flex items-center gap-1.5 lg:gap-2" role="group" aria-label={t('player.volume')}>
      <Tip content={settings.playback.muted ? t('player.unmute') : t('player.mute')}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => updateSetting('playback.muted', !settings.playback.muted)}
          className="flex-shrink-0 size-11 lg:size-11"
          aria-label={settings.playback.muted ? t('player.unmute') : t('player.mute')}
        >
        {settings.playback.muted || settings.playback.volume === 0 ? (
          <Icon name="volume_off" size={20} />
        ) : (
          <Icon name="volume_up" size={20} />
        )}
        </Button>
      </Tip>

      {/* Desktop Slider: collapsed to 0 width until the group is hovered or the
          slider itself has focus (keyboard users tabbing to it must still see it). */}
      <div className="hidden lg:flex items-center w-0 overflow-hidden transition-[width] duration-200 group-hover/volume:w-24 group-focus-within/volume:w-24">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={settings.playback.volume ?? 0}
          aria-label={t('player.volume')}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            updateSetting('playback.volume', val);
            if (val > 0 && settings.playback.muted) updateSetting('playback.muted', false);
          }}
          className="w-full"
          style={{
            background: `linear-gradient(to right, var(--iris) ${settings.playback.volume * 100}%, var(--hl) ${settings.playback.volume * 100}%)`
          }}
        />
      </div>

      {/* Mobile Controls */}
      {/* The -/+ stepper adds 88px to a transport row that already overflows at
          390px, and a phone has hardware volume keys. Mute stays. */}
      <div className="hidden sm:flex lg:hidden items-center gap-1">
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
