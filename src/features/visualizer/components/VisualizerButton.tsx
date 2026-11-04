import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveModal } from '@ui/ResponsiveModal';
import { Button } from '@ui/button';
import { Switch } from '@ui/switch';
import { Icon } from '@/shared/ui/Icon';
import { cn } from '@/shared/utils/utils';
import { useVisualizer } from '../visualizer-context';
import type { AudioFeed } from '../visualizer-context';
import { startVisualizer, VISUALIZER_PRESETS, isVisualizer3dPreset } from '../visualizer-presets';
import type { VisualizerKind, VisualizerPresetId } from '../visualizer-presets';
import { fillSimulated } from '../visualizer-signal';

const OPTIONS: readonly VisualizerKind[] = ['off', ...VISUALIZER_PRESETS];

// Each card animates its own preset on a steady 120 BPM stand-in, so the choice is visible
// before it is made. The loops live only while the modal is open.
function PresetPreview({ preset }: { preset: VisualizerPresetId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return startVisualizer(
      canvas,
      preset,
      (bands, wave, clock) => {
        fillSimulated(bands, wave, clock, 0.35 + 0.65 * Math.exp(-(clock % 0.5) / 0.18));
        return true;
      },
      { preview: true },
    );
  }, [preset]);
  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 size-full" />;
}

const LIVE_FEEDS: readonly AudioFeed[] = ['element', 'tab'];

function FeedStatus() {
  const { t } = useTranslation();
  const { feed, connecting, tabError, shareTabAudio, stopTabAudio } = useVisualizer();
  const live = LIVE_FEEDS.includes(feed);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/60 p-4" role="status">
      <div className="flex items-start gap-3">
        <Icon
          name={live ? 'check_circle' : 'info'}
          size={18}
          className={cn('mt-0.5 shrink-0', live ? 'text-primary' : 'text-muted-foreground')}
        />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-foreground">{t(`projectView.visualizer.feed.${feed}.title`)}</p>
          <p className="mt-1 text-muted-foreground">{t(`projectView.visualizer.feed.${feed}.body`)}</p>
        </div>
      </div>
      {tabError && feed === 'tab-available' && (
        <p className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning" role="alert">
          <Icon name="warning" size={14} className="mt-px shrink-0" />
          {t(`projectView.visualizer.error.${tabError}`)}
        </p>
      )}
      {feed === 'tab-available' && (
        <Button type="button" size="sm" onClick={shareTabAudio} disabled={connecting} className="self-start">
          <Icon name="graphic_eq" size={16} />
          {connecting ? t('projectView.visualizer.connecting') : t('projectView.visualizer.shareTab')}
        </Button>
      )}
      {feed === 'tab' && (
        <Button type="button" size="sm" variant="outline" onClick={stopTabAudio} className="self-start">
          {t('projectView.visualizer.stopSharing')}
        </Button>
      )}
    </div>
  );
}

/** Opens the visualizer picker. Styled to sit beside the playback bar's full-lyrics toggle. */
export function VisualizerButton() {
  const { t } = useTranslation();
  const { kind, setKind, bloom, setBloom } = useVisualizer();
  const [open, setOpen] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(() => {
    try {
      return localStorage.getItem('lrc_visualizer_bloom_tip_dismissed') === '1';
    } catch {
      return false;
    }
  });

  const dismissTip = () => {
    setTipDismissed(true);
    try {
      localStorage.setItem('lrc_visualizer_bloom_tip_dismissed', '1');
    } catch {
      /* ignore */
    }
  };

  const on = kind !== 'off';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={t('projectView.visualizer.button')}
        className={`inline-flex items-center justify-center gap-1.5 h-9 coarse:h-11 max-lg:size-11 max-xl:min-w-9 coarse:max-xl:min-w-11 px-2 xl:px-3 shrink-0 rounded-lg border text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${on ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border text-foreground hover:bg-muted'}`}
      >
        <Icon name="graphic_eq" size={18} />
        <span className="max-xl:sr-only">{t('projectView.visualizer.button')}</span>
      </button>

      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title={t('projectView.visualizer.title')}
        description={t('projectView.visualizer.description')}
      >
        <div className="flex flex-col gap-4">
          <div
            role="group"
            aria-label={t('projectView.visualizer.title')}
            className="max-h-[min(56vh,520px)] overflow-y-auto pr-1 sm:pr-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5"
          >
            {OPTIONS.map((option) => {
              const selected = option === kind;
              const is3d = option !== 'off' && isVisualizer3dPreset(option);
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setKind(option)}
                  className={cn(
                    'flex flex-col gap-2 rounded-xl p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    selected
                      ? 'bg-raised inset-ring-[1.5px] inset-ring-primary'
                      : 'inset-ring inset-ring-hl hover:bg-raised',
                  )}
                >
                  <span className="relative grid h-20 place-items-center overflow-hidden rounded-lg bg-background">
                    {option === 'off' ? (
                      <Icon name="block" size={22} className="text-muted-foreground" />
                    ) : (
                      <PresetPreview preset={option} />
                    )}
                    {is3d && (
                      <span className="absolute top-1.5 right-1.5 rounded bg-primary/20 px-1 py-0.5 text-[9px] font-bold tracking-wider text-primary uppercase">
                        3D
                      </span>
                    )}
                  </span>
                  <span className="px-1 pb-0.5">
                    <span className="block text-sm font-semibold text-foreground">
                      {t(`projectView.visualizer.kinds.${option}.label`)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t(`projectView.visualizer.kinds.${option}.hint`)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {on && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 p-4">
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-foreground">{t('projectView.visualizer.bloom.title')}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t('projectView.visualizer.bloom.description')}
                </p>
              </div>
              <Switch
                checked={bloom}
                onCheckedChange={setBloom}
                aria-label={t('projectView.visualizer.bloom.title')}
              />
            </div>
          )}

          {on && !tipDismissed && (
            <div
              className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/10 p-3 text-xs text-foreground"
              role="note"
            >
              <Icon name="info" size={16} className="mt-0.5 shrink-0 text-primary" />
              <span className="flex-1 text-muted-foreground">{t('projectView.visualizer.bloom.tip')}</span>
              <button
                type="button"
                onClick={dismissTip}
                aria-label={t('projectView.visualizer.bloom.dismissTip')}
                className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          )}

          {on && <FeedStatus />}
        </div>
      </ResponsiveModal>
    </>
  );
}
