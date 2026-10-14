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
import { cn } from '@/shared/utils/utils';

interface SpeedControlProps {
  playbackSpeed: number;
  applySpeed: (speed: number) => void;
  MIN_SPEED: number;
  MAX_SPEED: number;
  SPEED_PRESETS: number[];
}

const STEP_BUTTON = 'h-[38px] w-9 rounded-[9px] font-mono text-lg font-semibold text-subtle hover:bg-raised hover:text-foreground coarse:h-11 coarse:w-11';

/**
 * Slower / current speed / faster as one field (redesign sheet 14). The value in the
 * middle opens the presets and a custom speed.
 */
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
    <div
      role="group"
      aria-label={t('player.speed')}
      className="flex shrink-0 items-center gap-0.5 rounded-[var(--radius-control)] bg-card p-[3px] inset-ring inset-ring-hl"
    >
      <Tip content={t('player.decreaseSpeed')}>
        <Button
          variant="ghost"
          size={null}
          onClick={stepDown}
          disabled={playbackSpeed <= MIN_SPEED}
          aria-label={t('player.decreaseSpeed')}
          className={STEP_BUTTON}
        >
          −
        </Button>
      </Tip>

      <Popover>
        <Tip content={t('player.speed')}>
          <PopoverTrigger asChild>
            <Button
              id="speed-btn"
              variant="ghost"
              size={null}
              aria-label={`${t('player.speed')}: ${playbackSpeed}x`}
              // Iris when the speed is anything but normal, so a slowed-down song is hard to forget.
              className={cn('h-[38px] min-w-[58px] rounded-[9px] px-1.5 font-mono text-sm font-semibold tabular-nums coarse:h-11', playbackSpeed !== 1 ? 'text-primary-ink' : 'text-foreground')}
            >
              {playbackSpeed}×
            </Button>
          </PopoverTrigger>
        </Tip>
        <PopoverContent className="w-56 lg:w-52 p-0 overflow-hidden" align="end">
          {/* Preset chips — quick one-tap selection */}
          <div className="grid grid-cols-3 gap-1.5 p-2.5">
            {SPEED_PRESETS.map((speed) => (
              <button
                key={speed}
                onClick={() => applySpeed(speed)}
                aria-pressed={playbackSpeed === speed}
                className={cn(
                  'rounded-lg py-1.5 font-mono text-sm transition-[background-color,box-shadow,color] duration-[var(--duration-state)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus',
                  playbackSpeed === speed
                    ? 'bg-primary-soft font-bold text-primary-ink inset-ring-[1.5px] inset-ring-iris'
                    : 'bg-raised text-foreground inset-ring inset-ring-hl hover:inset-ring-faint',
                )}
              >
                {speed}×
              </button>
            ))}
          </div>
          <div className="border-t border-hl p-3 lg:p-2" onPointerDown={(e) => e.stopPropagation()}>
            <label htmlFor="custom-speed-input" className="mb-2 block font-mono text-[11px] font-semibold tracking-[0.1em] text-subtle uppercase">
              {t('player.customSpeed')} ({MIN_SPEED}–{MAX_SPEED}×)
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
              <Button size="sm" onClick={handleCustomSpeedSubmit} disabled={!isCustomValid}>
                {t('common.apply')}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Tip content={t('player.increaseSpeed')}>
        <Button
          variant="ghost"
          size={null}
          onClick={stepUp}
          disabled={playbackSpeed >= MAX_SPEED}
          aria-label={t('player.increaseSpeed')}
          className={STEP_BUTTON}
        >
          +
        </Button>
      </Tip>
    </div>
  );
});

export default SpeedControl;
