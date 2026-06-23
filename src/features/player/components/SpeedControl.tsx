import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import NumberInput from '@shared/ui/NumberInput';
import { Button } from '@ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ui/popover';
import { Tip } from '@ui/tip';
import { ChevronDown, Minus, Plus } from 'lucide-react';

interface SpeedControlProps {
  playbackSpeed: number;
  applySpeed: (speed: number) => void;
  MIN_SPEED: number;
  MAX_SPEED: number;
  SPEED_PRESETS: number[];
}

const SpeedControl = memo(function SpeedControl({
  playbackSpeed,
  applySpeed,
  MIN_SPEED,
  MAX_SPEED,
  SPEED_PRESETS
}: SpeedControlProps) {
  const { t } = useTranslation();
  const [customSpeedInput, setCustomSpeedInput] = useState('');

  const handleCustomSpeedSubmit = () => {
    const val = parseFloat(customSpeedInput);
    if (!isNaN(val) && val >= MIN_SPEED && val <= MAX_SPEED) {
      applySpeed(val);
      setCustomSpeedInput('');
    }
  };

  const isCustomValid =
    customSpeedInput &&
    !isNaN(parseFloat(customSpeedInput)) &&
    parseFloat(customSpeedInput) >= MIN_SPEED &&
    parseFloat(customSpeedInput) <= MAX_SPEED;

  const stepDown = () => applySpeed(Math.round((playbackSpeed - 0.05) * 1000) / 1000);
  const stepUp = () => applySpeed(Math.round((playbackSpeed + 0.05) * 1000) / 1000);

  return (
    <div className="flex items-center gap-1 sm:gap-0.5 flex-shrink-0" role="group" aria-label={t('player.speed') || 'Playback speed'}>
      {/* Speed down */}
      <Tip content={t('player.decreaseSpeed')}>
        <button
          onClick={stepDown}
          disabled={playbackSpeed <= MIN_SPEED}
          className="size-8 lg:w-6 lg:h-6 flex items-center justify-center rounded-full lg:rounded bg-zinc-800/60 lg:bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label={t('player.decreaseSpeed')}
        >
          <Minus className="size-4 lg:w-3 lg:h-3" />
        </button>
      </Tip>

      {/* Speed badge + dropdown */}
      <Popover>
        <Tip content={t('player.speed') || 'Speed'}>
          <PopoverTrigger asChild>
            <Button
              id="speed-btn"
              aria-label={`${t('player.speed') || 'Speed'}: ${playbackSpeed}x`}
              className={`h-9 lg:h-9 px-2.5 sm:px-3 font-mono font-bold rounded-full gap-1 transition-all ${
                playbackSpeed !== 1
                  ? 'bg-primary text-zinc-950 shadow-lg shadow-primary/30 hover:bg-primary-dim'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              <span className="text-[13px] lg:text-sm">{playbackSpeed}x</span>
              <ChevronDown className="size-3 lg:w-2.5 lg:h-2.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Button>
          </PopoverTrigger>
        </Tip>
        <PopoverContent
          className="w-56 lg:w-52 p-0 overflow-hidden bg-zinc-950 border-zinc-800 shadow-2xl"
          align="end"
        >
          {/* Preset chips — quick one-tap selection */}
          <div className="grid grid-cols-3 gap-1.5 p-2.5">
            {SPEED_PRESETS.map((speed) => (
              <button
                key={speed}
                onClick={() => applySpeed(speed)}
                aria-pressed={playbackSpeed === speed}
                className={`font-mono text-sm rounded-lg py-1.5 transition-colors cursor-pointer border ${
                  playbackSpeed === speed
                    ? 'bg-primary/20 text-primary font-bold border-primary/50'
                    : 'bg-zinc-800/60 text-zinc-300 border-zinc-700/60 hover:bg-zinc-700 hover:text-zinc-100'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
          <div className="border-t border-zinc-800 p-3 lg:p-2" onPointerDown={(e) => e.stopPropagation()}>
            <label className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-2 block">
              {t('player.customSpeed') || 'Custom'} ({MIN_SPEED}–{MAX_SPEED}x)
            </label>
            <div className="flex gap-1.5">
              <NumberInput
                id="custom-speed-input"
                min={MIN_SPEED}
                max={MAX_SPEED}
                step={0.05}
                value={customSpeedInput}
                onChange={(e) => setCustomSpeedInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomSpeedSubmit()}
                placeholder={t('player.speedPlaceholder')}
                className="flex-1 w-0 h-9 lg:h-8"
              />
              <Button
                size="sm"
                onClick={handleCustomSpeedSubmit}
                disabled={!isCustomValid}
                className="px-3 bg-primary hover:bg-primary-dim disabled:bg-zinc-900 disabled:text-zinc-700 text-zinc-950 font-bold"
              >
                {t('common.apply')}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Speed up */}
      <Tip content={t('player.increaseSpeed')}>
        <button
          onClick={stepUp}
          disabled={playbackSpeed >= MAX_SPEED}
          className="size-8 lg:w-6 lg:h-6 flex items-center justify-center rounded-full lg:rounded bg-zinc-800/60 lg:bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label={t('player.increaseSpeed')}
        >
          <Plus className="size-4 lg:w-3 lg:h-3" />
        </button>
      </Tip>
    </div>
  );
});

export default SpeedControl;
