import { useTranslation } from 'react-i18next';
import { Section, SettingRow, Toggle, SettingSelect, SettingOption } from '../shared';
import { useInterfaceSettings } from '../../hooks/useInterfaceSettings';
import { cn } from '@/shared/utils/utils';
import { Tip } from '@ui/tip';
import { useState } from 'react';
import ThemeSelector from '../theme/ThemeSelector';
import ThemeModal from '../theme/ThemeModal';
type SelectEvent = { target: { value: string } };

interface InterfaceSettingsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: { interface?: Record<string, any>; editor?: Record<string, any>; [key: string]: any };
  updateSetting: (path: string, value: unknown) => void;
  searchTerm?: string;
}

// Thin → thick; each value is a [data-font-weight] ramp in index.css.
const FONT_WEIGHTS = ['thinnest', 'lighter', 'light', 'normal', 'bold', 'bolder'] as const;

const TOAST_POSITIONS = [
  { value: 'top-left', labelKey: 'topLeft', v: 'items-start', h: 'justify-start' },
  { value: 'top-center', labelKey: 'topCenter', v: 'items-start', h: 'justify-center' },
  { value: 'top-right', labelKey: 'topRight', v: 'items-start', h: 'justify-end' },
  { value: 'bottom-left', labelKey: 'bottomLeft', v: 'items-end', h: 'justify-start' },
  { value: 'bottom-center', labelKey: 'bottomCenter', v: 'items-end', h: 'justify-center' },
  { value: 'bottom-right', labelKey: 'bottomRight', v: 'items-end', h: 'justify-end' },
] as const;

/** Appearance: theme, type weight, the header and where notifications pop up. */
export default function InterfaceSettings({ settings, updateSetting, searchTerm }: InterfaceSettingsProps) {
  const { t } = useTranslation();
  const tk = t as (key: string, opts?: Record<string, unknown>) => string;
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const { handleToastPositionChange } = useInterfaceSettings(updateSetting) as Record<string, (e: SelectEvent) => void>;

  const ui = settings.interface ?? {};
  const fontWeight = ui.fontWeight ?? 'normal';
  const toastPosition = ui.toastPosition ?? 'bottom-right';
  const toastLabel = tk(`settings.options.positions.${TOAST_POSITIONS.find((p) => p.value === toastPosition)?.labelKey ?? 'bottomRight'}`);

  return (
    <>
      <Section title={t('settings.interface.themeSection')} searchTerm={searchTerm}>
        <ThemeSelector settings={settings} updateSetting={updateSetting} onBrowseAll={() => setThemeModalOpen(true)} />
        <ThemeModal open={themeModalOpen} onOpenChange={setThemeModalOpen} settings={settings} updateSetting={updateSetting} />
        <SettingRow label={t('settings.interface.keepThemeOnSignOut')} description={t('settings.interface.keepThemeOnSignOutDesc')}>
          <Toggle id="toggle-keep-theme" label={t('settings.interface.keepThemeOnSignOut')} checked={ui.keepThemeOnSignOut ?? true} onChange={(v: boolean) => updateSetting('interface.keepThemeOnSignOut', v)} />
        </SettingRow>
      </Section>

      <Section title={t('settings.interface.generalSection')} searchTerm={searchTerm}>
        <SettingRow label={t('settings.interface.fontWeight')} description={t('settings.interface.fontWeightDesc')}>
          <div className="flex flex-col items-end gap-1.5">
            {/* Six presets don't fit a segmented control on narrow screens. */}
            <SettingSelect label={t('settings.interface.fontWeight')} value={fontWeight} onValueChange={(v) => updateSetting('interface.fontWeight', v)}>
              {FONT_WEIGHTS.map((w) => (
                <SettingOption key={w} value={w}>{tk(`settings.options.weights.${w}`)}</SettingOption>
              ))}
            </SettingSelect>
            {/* Shows the ramp itself rather than one sample: the setting flattens the
                distance between body copy and headings, which a single word cannot show.
                It previews live because the attribute is already on <html>. */}
            <span aria-hidden="true" className="flex items-baseline gap-2 text-zinc-300">
              <span className="text-[15px] font-normal">{t('settings.interface.fontWeightSample')}</span>
              <span className="text-[15px] font-semibold">{t('settings.interface.fontWeightSample')}</span>
              <span className="text-[15px] font-bold">{t('settings.interface.fontWeightSample')}</span>
            </span>
          </div>
        </SettingRow>
        <SettingRow label={t('settings.interface.autoHideHeader')} description={t('settings.interface.autoHideHeaderDesc')}>
          <Toggle id="toggle-auto-hide-header" label={t('settings.interface.autoHideHeader')} checked={ui.autoHideHeader ?? false} onChange={(v: boolean) => updateSetting('interface.autoHideHeader', v)} />
        </SettingRow>
        <SettingRow label={t('settings.interface.toastPosition')} description={toastLabel}>
          <div
            role="radiogroup"
            aria-label={t('settings.interface.toastPosition')}
            className="grid grid-cols-3 gap-1 w-[150px] h-[72px] p-1 rounded-[calc(var(--radius)*1)] border border-zinc-700 bg-zinc-950"
          >
            {TOAST_POSITIONS.map((p) => {
              const on = toastPosition === p.value;
              const label = tk(`settings.options.positions.${p.labelKey}`);
              return (
                <Tip key={p.value} content={label}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={label}
                    onClick={() => handleToastPositionChange({ target: { value: p.value } })}
                    className={cn('flex p-1 rounded-md', p.v, p.h, on ? 'bg-zinc-800' : 'hover:bg-zinc-900')}
                  >
                    <span className={cn('block w-[18px] h-2 rounded-[calc(var(--radius)*0.3)]', on ? 'bg-primary' : 'bg-zinc-700')} />
                  </button>
                </Tip>
              );
            })}
          </div>
        </SettingRow>
      </Section>
    </>
  );
}
