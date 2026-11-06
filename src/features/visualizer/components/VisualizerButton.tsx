import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Tip } from '@ui/tip';

const OPTIONS: readonly VisualizerKind[] = ['off', ...VISUALIZER_PRESETS];

type VisualizerCategory = 'all' | 'interactive' | 'classic' | '2d';

const CATEGORIES = [
  { id: 'all', labelKey: 'projectView.visualizer.categories.all' as const },
  { id: 'interactive', labelKey: 'projectView.visualizer.categories.interactive' as const },
  { id: 'classic', labelKey: 'projectView.visualizer.categories.classic' as const },
  { id: '2d', labelKey: 'projectView.visualizer.categories.twoD' as const },
] as const;

const INTERACTIVE_3D_SET = new Set<VisualizerKind>([
  'ferrofluid',
  'silk',
  'plasma-globe',
  'urchin',
  'pond',
]);

const CLASSIC_3D_SET = new Set<VisualizerKind>([
  'orb',
  'terrain',
  'galaxy',
  'tunnel',
  'pillars',
  'aurora',
  'cymatics',
  'skyline',
  'vinyl',
  'ink',
]);

const TWO_D_SET = new Set<VisualizerKind>(['off', 'bars', 'wave', 'radial', 'contour']);

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
    <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-background/60 p-3 sm:p-3.5" role="status">
      <div className="flex items-start gap-2.5">
        <Icon
          name={live ? 'check_circle' : 'info'}
          size={16}
          className={cn('mt-0.5 shrink-0', live ? 'text-primary' : 'text-muted-foreground')}
        />
        <div className="min-w-0 flex-1 text-xs">
          <p className="font-semibold text-foreground">{t(`projectView.visualizer.feed.${feed}.title`)}</p>
          <p className="mt-0.5 text-muted-foreground">{t(`projectView.visualizer.feed.${feed}.body`)}</p>
        </div>
      </div>
      {tabError && feed === 'tab-available' && (
        <p className="flex items-start gap-2 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs text-warning" role="alert">
          <Icon name="warning" size={14} className="mt-px shrink-0" />
          {t(`projectView.visualizer.error.${tabError}`)}
        </p>
      )}
      {feed === 'tab-available' && (
        <Button type="button" size="sm" onClick={shareTabAudio} disabled={connecting} className="self-start h-8 text-xs">
          <Icon name="graphic_eq" size={14} />
          {connecting ? t('projectView.visualizer.connecting') : t('projectView.visualizer.shareTab')}
        </Button>
      )}
      {feed === 'tab' && (
        <Button type="button" size="sm" variant="outline" onClick={stopTabAudio} className="self-start h-8 text-xs">
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
  const [category, setCategory] = useState<VisualizerCategory>('all');
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

  const filteredOptions = useMemo(() => {
    if (category === 'interactive') return OPTIONS.filter((o) => INTERACTIVE_3D_SET.has(o));
    if (category === 'classic') return OPTIONS.filter((o) => CLASSIC_3D_SET.has(o));
    if (category === '2d') return OPTIONS.filter((o) => TWO_D_SET.has(o));
    return OPTIONS;
  }, [category]);

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
        dialogProps={{
          className:
            'sm:max-w-3xl md:max-w-4xl max-h-[85vh] flex flex-col p-4 sm:p-5 overflow-hidden',
        }}
        drawerProps={{
          className: 'max-h-[88vh]',
        }}
      >
        <div className="flex flex-col gap-3 min-h-0 flex-1 overflow-hidden">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 shrink-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={cn(
                  'px-3 py-1 rounded-pill text-xs font-medium transition-colors shrink-0',
                  category === cat.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {t(cat.labelKey)}
              </button>
            ))}
          </div>

          {/* Unified Scrollable Body */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2 flex flex-col gap-3.5">
            <div
              role="group"
              aria-label={t('projectView.visualizer.title')}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2"
            >
              {filteredOptions.map((option) => {
                const selected = option === kind;
                const is3d = option !== 'off' && isVisualizer3dPreset(option);
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setKind(option)}
                    className={cn(
                      'flex flex-col gap-1.5 rounded-xl p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                      selected
                        ? 'bg-raised inset-ring-[1.5px] inset-ring-primary'
                        : 'inset-ring inset-ring-hl hover:bg-raised',
                    )}
                  >
                    <span className="relative grid h-16 sm:h-18 place-items-center overflow-hidden rounded-lg bg-background">
                      {option === 'off' ? (
                        <Icon name="block" size={20} className="text-muted-foreground" />
                      ) : (
                        <PresetPreview preset={option} />
                      )}
                      {is3d && (
                        <span className="absolute top-1.5 right-1.5 rounded-xs bg-primary/20 px-1 py-0.5 text-[8.5px] font-bold tracking-wider text-primary uppercase">
                          3D
                        </span>
                      )}
                    </span>
                    <span className="px-0.5 pb-0.5 min-w-0">
                      <span className="block text-xs font-semibold text-foreground truncate">
                        {t(`projectView.visualizer.kinds.${option}.label`)}
                      </span>
                      <span
                        className="block text-[11px] text-muted-foreground truncate"
                        title={t(`projectView.visualizer.kinds.${option}.hint`)}
                      >
                        {t(`projectView.visualizer.kinds.${option}.hint`)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bloom Toggle */}
            {on && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 p-3 sm:p-3.5">
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-semibold text-foreground">{t('projectView.visualizer.bloom.title')}</p>
                  <p className="mt-0.5 text-muted-foreground">
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

            {/* Bloom Tip */}
            {on && !tipDismissed && (
              <div
                className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/10 p-2.5 text-xs text-foreground"
                role="note"
              >
                <Icon name="info" size={16} className="mt-0.5 shrink-0 text-primary" />
                <span className="flex-1 text-muted-foreground">{t('projectView.visualizer.bloom.tip')}</span>
                <Tip content={t('projectView.visualizer.bloom.dismissTip')}>
                  <button
                    type="button"
                    onClick={dismissTip}
                    aria-label={t('projectView.visualizer.bloom.dismissTip')}
                    className="shrink-0 rounded-xs p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </Tip>
              </div>
            )}

            {/* Audio Feed Status */}
            {on && <FeedStatus />}
          </div>
        </div>
      </ResponsiveModal>
    </>
  );
}
