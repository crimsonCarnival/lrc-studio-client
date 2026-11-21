import { useTranslation } from 'react-i18next';
import { Section, SettingRow, Toggle, SettingSelect, SettingOption } from '../shared';
import { useInterfaceSettings } from '../../hooks/useInterfaceSettings';
import { useAdvancedSettings } from '../../hooks/useAdvancedSettings';

const COMMON_TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Bogota', 'America/Sao_Paulo', 'America/Argentina/Buenos_Aires', 'America/Mexico_City',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Moscow',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Seoul', 'Asia/Dubai',
  'Australia/Sydney', 'Pacific/Auckland', 'Africa/Cairo', 'Africa/Nairobi',
];

interface LanguageRegionSettingsProps {
  settings: {
    interface?: { defaultLanguage?: string };
    advanced?: { timezone?: string; hourCycle?: string; dateStyle?: string; showUtcOffset?: boolean };
  };
  updateSetting: (path: string, value: unknown) => void;
  searchTerm?: string;
}

/** The app's language, and how dates and times are written: one place for everything locale. */
export default function LanguageRegionSettings({ settings, updateSetting, searchTerm }: LanguageRegionSettingsProps) {
  const { t, i18n } = useTranslation();
  const ui = settings.interface ?? {};
  const { handleLanguageChange } = useInterfaceSettings(updateSetting);
  const { handleTimezoneChange } = useAdvancedSettings(updateSetting);

  return (
    <>
      <Section title={t('settings.region.languageSection')} searchTerm={searchTerm}>
        <SettingRow label={t('settings.interface.language')} description={t('settings.interface.languageDesc')}>
          <SettingSelect label={t('settings.interface.language')} value={i18n.resolvedLanguage ?? ui.defaultLanguage ?? 'en'} onValueChange={(val) => handleLanguageChange({ target: { value: val } })}>
            <SettingOption value="en">{t('common.language.en')}</SettingOption>
            <SettingOption value="es">{t('common.language.es')}</SettingOption>
          </SettingSelect>
        </SettingRow>
      </Section>

      <Section title={t('settings.advanced.regionSection')} searchTerm={searchTerm}>
        <SettingRow label={t('settings.advanced.timezone')} description={t('settings.advanced.timezoneDesc')}>
          <SettingSelect
            label={t('settings.advanced.timezone')}
            className="max-w-[260px]"
            value={settings.advanced?.timezone ?? 'auto'}
            onValueChange={(val) => handleTimezoneChange({ target: { value: val } })}
          >
            <SettingOption value="auto">
              {t('settings.advanced.timezoneAuto')} · {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </SettingOption>
            {COMMON_TIMEZONES.map((tz) => (
              <SettingOption key={tz} value={tz}>{tz.replace(/_/g, ' ')}</SettingOption>
            ))}
          </SettingSelect>
        </SettingRow>

        <SettingRow label={t('settings.advanced.hourCycle')} description={t('settings.advanced.hourCycleDesc')}>
          <SettingSelect
            label={t('settings.advanced.hourCycle')}
            value={settings.advanced?.hourCycle ?? 'auto'}
            onValueChange={(val) => updateSetting('advanced.hourCycle', val)}
          >
            <SettingOption value="auto">{t('settings.advanced.hourCycleAuto')}</SettingOption>
            <SettingOption value="12">{t('settings.advanced.hourCycle12')}</SettingOption>
            <SettingOption value="24">{t('settings.advanced.hourCycle24')}</SettingOption>
          </SettingSelect>
        </SettingRow>

        <SettingRow label={t('settings.advanced.dateStyle')} description={t('settings.advanced.dateStyleDesc')}>
          <SettingSelect
            label={t('settings.advanced.dateStyle')}
            value={settings.advanced?.dateStyle ?? 'long'}
            onValueChange={(val) => updateSetting('advanced.dateStyle', val)}
          >
            <SettingOption value="long">{t('settings.advanced.dateStyleLong')}</SettingOption>
            <SettingOption value="short">{t('settings.advanced.dateStyleShort')}</SettingOption>
          </SettingSelect>
        </SettingRow>

        <SettingRow label={t('settings.advanced.showUtcOffset')} description={t('settings.advanced.showUtcOffsetDesc')}>
          <Toggle id="toggle-show-utc-offset" label={t('settings.advanced.showUtcOffset')} checked={settings.advanced?.showUtcOffset ?? true} onChange={(v: boolean) => updateSetting('advanced.showUtcOffset', v)} />
        </SettingRow>
      </Section>

    </>
  );
}
