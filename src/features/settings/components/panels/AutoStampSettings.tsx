import { useTranslation } from 'react-i18next';
import { Section, SettingRow, PercentSlider, SettingSelect, SettingOption } from '../shared';
import { cn } from '@/shared/utils/utils';

interface AutoStampSettingsProps {
  settings: {
    autoStamp?: {
      confidenceThreshold?: number;
      fuzzyTolerance?: number;
      applyMode?: 'all' | 'empty-only';
    };
  };
  updateSetting: (path: string, value: unknown) => void;
  searchTerm?: string;
}

// Illustrative lines used to show what the current threshold would do.
const SAMPLE_CONFIDENCES = [94, 78, 52];

// Stored as 0.5–1; the slider works in whole percent.
const toPercent = (v: number) => Math.round(v * 100);
const fromPercent = (p: number) => Math.min(1, Math.max(0.5, p / 100));

export default function AutoStampSettings({ settings, updateSetting, searchTerm }: AutoStampSettingsProps) {
  const { t } = useTranslation();
  const confidence = toPercent(settings.autoStamp?.confidenceThreshold ?? 0.8);
  const tolerance = toPercent(settings.autoStamp?.fuzzyTolerance ?? 0.75);

  return (
    <>
      <Section title={t('settings.autoStamp.precisionSection')} searchTerm={searchTerm}>
        <SettingRow
          label={t('settings.autoStamp.confidenceThreshold')}
          description={t('settings.autoStamp.confidenceThresholdDesc')}
        >
          <PercentSlider
            label={t('settings.autoStamp.confidenceThreshold')}
            min={50}
            value={confidence}
            onChange={(p) => updateSetting('autoStamp.confidenceThreshold', fromPercent(p))}
          />
        </SettingRow>
        <div className="mb-4 flex flex-col gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3.5">
          <p className="text-[13px] text-zinc-400">{t('settings.autoStamp.sampleTitle')}</p>
          {SAMPLE_CONFIDENCES.map((pct, i) => {
            const applied = pct >= confidence;
            return (
              <div key={pct} className="flex items-center gap-3 text-sm">
                <span className="flex-1 min-w-0 truncate text-zinc-100">{t('settings.autoStamp.sampleLine', { n: i + 1 })}</span>
                <span className="hidden sm:block w-[120px] h-1.5 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                  <span className={cn('block h-full', applied ? 'bg-teal-400' : 'bg-amber-400')} style={{ width: `${pct}%` }} />
                </span>
                <span className="w-10 text-right font-mono text-xs text-zinc-400 shrink-0">{pct}%</span>
                <span className={cn(
                  'w-[72px] py-[3px] text-center rounded-full text-xs font-bold shrink-0',
                  applied ? 'bg-teal-950 text-teal-300' : 'bg-amber-950 text-amber-300',
                )}>
                  {applied ? t('settings.autoStamp.sampleApplied') : t('settings.autoStamp.sampleReview')}
                </span>
              </div>
            );
          })}
        </div>
        <SettingRow
          label={t('settings.autoStamp.fuzzyTolerance')}
          description={t('settings.autoStamp.fuzzyToleranceDesc')}
        >
          <PercentSlider
            label={t('settings.autoStamp.fuzzyTolerance')}
            min={50}
            value={tolerance}
            onChange={(p) => updateSetting('autoStamp.fuzzyTolerance', fromPercent(p))}
          />
        </SettingRow>
      </Section>

      <Section title={t('settings.autoStamp.applySection')} searchTerm={searchTerm}>
        <SettingRow
          label={t('settings.autoStamp.applyMode')}
          description={t('settings.autoStamp.applyModeDesc')}
        >
          <SettingSelect value={settings.autoStamp?.applyMode ?? 'empty-only'} onValueChange={(val) => updateSetting('autoStamp.applyMode', val)}>
              <SettingOption value="all">{t('settings.autoStamp.applyModeAll')}</SettingOption>
              <SettingOption value="empty-only">{t('settings.autoStamp.applyModeEmptyOnly')}</SettingOption>
            </SettingSelect>
        </SettingRow>
      </Section>
    </>
  );
}
