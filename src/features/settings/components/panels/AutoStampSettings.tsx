import { useTranslation } from 'react-i18next';
import NumberInput from '@shared/ui/NumberInput';
import { Section, SettingRow } from '../shared';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';

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

export default function AutoStampSettings({ settings, updateSetting, searchTerm }: AutoStampSettingsProps) {
  const { t } = useTranslation();

  return (
    <Section title={t('settings.autoStamp.title')} iconName="auto_awesome" searchTerm={searchTerm}>
      <SettingRow
        iconName="verified"
        label={t('settings.autoStamp.confidenceThreshold')}
        description={t('settings.autoStamp.confidenceThresholdDesc')}
      >
        <NumberInput
          min={0.5}
          max={1}
          step={0.05}
          value={settings.autoStamp?.confidenceThreshold ?? 0.8}
          onChange={(e) => updateSetting('autoStamp.confidenceThreshold', Math.min(1, Math.max(0.5, parseFloat(e.target.value) || 0.8)))}
          className="w-20"
        />
      </SettingRow>
      <SettingRow
        iconName="rule"
        label={t('settings.autoStamp.fuzzyTolerance')}
        description={t('settings.autoStamp.fuzzyToleranceDesc')}
      >
        <NumberInput
          min={0.5}
          max={1}
          step={0.05}
          value={settings.autoStamp?.fuzzyTolerance ?? 0.75}
          onChange={(e) => updateSetting('autoStamp.fuzzyTolerance', Math.min(1, Math.max(0.5, parseFloat(e.target.value) || 0.75)))}
          className="w-20"
        />
      </SettingRow>
      <SettingRow
        iconName="tune"
        label={t('settings.autoStamp.applyMode')}
      >
        <Select
          value={settings.autoStamp?.applyMode ?? 'empty-only'}
          onValueChange={(val) => updateSetting('autoStamp.applyMode', val)}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all">{t('settings.autoStamp.applyModeAll')}</SelectItem>
            <SelectItem value="empty-only">{t('settings.autoStamp.applyModeEmptyOnly')}</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </Section>
  );
}
