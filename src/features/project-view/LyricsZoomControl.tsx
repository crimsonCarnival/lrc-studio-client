import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Tip } from '@ui/tip';
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover';
import { cn } from '@/shared/utils/utils';
import { ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN, ZOOM_PRESETS, clampZoom } from './lyrics-zoom';

type LyricsZoomControlProps = {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  className?: string;
};

const pct = (zoom: number) => `${Math.round(zoom * 100)}%`;

/**
 * Lyrics zoom for touch screens, where there is no ctrl+wheel: a dropdown with
 * presets and a slider for anything in between.
 */
export function LyricsZoomControl({ zoom, onZoomChange, className }: LyricsZoomControlProps) {
  const { t } = useTranslation();
  const fill = ((zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100;

  return (
    <Popover>
      <Tip content={t('projectView.zoom.label')}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t('projectView.zoom.current', { value: pct(zoom) })}
            className={cn(
              'flex h-8 coarse:h-11 items-center gap-1 rounded-lg border border-zinc-700/50 bg-zinc-950/70 px-2 text-xs font-mono font-medium tabular-nums text-zinc-300 shadow-lg backdrop-blur-md',
              className,
            )}
          >
            <Icon name="zoom_in" size={15} />
            {pct(zoom)}
          </button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent align="end" className="flex flex-col gap-3 p-3">
        <p className="text-sm font-semibold text-foreground">{t('projectView.zoom.label')}</p>
        <div role="group" aria-label={t('projectView.zoom.presets')} className="grid grid-cols-5 gap-1">
          {ZOOM_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onZoomChange(preset)}
              aria-pressed={zoom === preset}
              className={cn(
                'h-9 coarse:h-11 rounded-md text-xs font-mono font-medium tabular-nums transition-colors',
                zoom === preset ? 'bg-primary/20 text-primary' : 'text-zinc-300 hover:bg-raised',
              )}
            >
              {pct(preset)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Icon name="text_decrease" size={16} className="shrink-0 text-subtle" aria-hidden />
          <input
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={0.05}
            value={zoom}
            onChange={(e) => onZoomChange(clampZoom(parseFloat(e.target.value)))}
            aria-label={t('projectView.zoom.slider')}
            aria-valuetext={pct(zoom)}
            className="h-11 w-full"
            style={{ background: `linear-gradient(to right, var(--iris) ${fill}%, var(--hl) ${fill}%) center / 100% 4px no-repeat` }}
          />
          <Icon name="text_increase" size={16} className="shrink-0 text-subtle" aria-hidden />
        </div>
        <button
          type="button"
          onClick={() => onZoomChange(ZOOM_DEFAULT)}
          disabled={zoom === ZOOM_DEFAULT}
          className="self-end text-xs text-primary hover:underline disabled:pointer-events-none disabled:opacity-40"
        >
          {t('projectView.zoom.reset')}
        </button>
      </PopoverContent>
    </Popover>
  );
}
