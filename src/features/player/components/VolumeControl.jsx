import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/features/settings/useSettings';
import { Button } from '@ui/button';
import { Volume2, VolumeX, Minus, Plus } from 'lucide-react';
import { Tip } from '@ui/tip';

const VolumeControl = React.memo(function VolumeControl() {
  const { t } = useTranslation();
  const { settings, updateSetting } = useSettings();

  return (
    <div className="flex items-center gap-1.5 lg:gap-2" role="group" aria-label={t('player.volume') || 'Volume'}>
      <Tip content={settings.playback.muted ? t('player.unmute') || 'Unmute' : t('player.mute') || 'Mute'}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => updateSetting('playback.muted', !settings.playback.muted)}
          className="rounded-full bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 flex-shrink-0 size-9 lg:w-9 lg:h-9"
          aria-label={settings.playback.muted ? t('player.unmute') || 'Unmute' : t('player.mute') || 'Mute'}
        >
        {settings.playback.muted || settings.playback.volume === 0 ? (
          <VolumeX className="size-4.5 lg:w-4 lg:h-4" />
        ) : (
          <Volume2 className="size-4.5 lg:w-4 lg:h-4" />
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
            className="size-8 rounded-full bg-zinc-800/60 flex items-center justify-center text-zinc-500 active:bg-zinc-700 active:text-zinc-200"
            aria-label={t('player.decreaseVolume')}
          >
            <Minus className="size-4" />
          </button>
        </Tip>
        <Tip content={t('player.increaseVolume')}>
          <button
            onClick={() => updateSetting('playback.volume', Math.min(1, settings.playback.volume + 0.1))}
            className="size-8 rounded-full bg-zinc-800/60 flex items-center justify-center text-zinc-500 active:bg-zinc-700 active:text-zinc-200"
            aria-label={t('player.increaseVolume')}
          >
            <Plus className="size-4" />
          </button>
        </Tip>
      </div>
    </div>
  );
});

export default VolumeControl;
