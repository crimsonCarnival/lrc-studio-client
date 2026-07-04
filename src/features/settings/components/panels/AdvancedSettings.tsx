import { useTranslation } from 'react-i18next';
import { Section, SettingRow, Toggle } from '../shared';
import { useAdvancedSettings } from '../../hooks/useAdvancedSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Icon } from '@/shared/ui/Icon';

import { Button } from '@ui/button';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useState } from 'react';
import toast from 'react-hot-toast';

const COMMON_TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Bogota', 'America/Sao_Paulo', 'America/Argentina/Buenos_Aires', 'America/Mexico_City',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Moscow',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Seoul', 'Asia/Dubai',
  'Australia/Sydney', 'Pacific/Auckland', 'Africa/Cairo', 'Africa/Nairobi',
];

interface AdvancedSettingsProps {
  settings: {
    advanced?: {
      autoSave?: { enabled?: boolean; timeInterval?: number };
      autoSaveIndicator?: string;
      confirmDestructive?: boolean;
      timezone?: string;
    };
  };
  updateSetting: (path: string, value: unknown) => void;
  searchTerm?: string;
  isGuest?: boolean;
}

export default function AdvancedSettings({ settings, updateSetting, searchTerm, isGuest }: AdvancedSettingsProps) {
  const { t } = useTranslation();
  const { deactivateAccount } = useAuthContext();
  const [isDeactivating, setIsDeactivating] = useState(false);
  const {
    handleAutoSaveToggle,
    handleAutoSaveTimeIntervalChange,
    handleConfirmDestructiveChange,
    handleTimezoneChange,
  } = useAdvancedSettings(updateSetting);

  const handleDeactivate = async () => {
    if (!window.confirm(t('settings.advanced.deactivateConfirm'))) {
      return;
    }

    try {
      setIsDeactivating(true);
      await deactivateAccount();
      toast.success(t('settings.advanced.deactivateSuccess') || 'Account deactivated successfully.');
    } catch (err) {
      console.error(err);
      toast.error(t('settings.advanced.deactivateError') || 'Failed to deactivate account.');
      setIsDeactivating(false);
    }
  };

  return (
    <>
      <Section title={t('settings.advanced.label')} iconName="tune" searchTerm={searchTerm}>
        {isGuest ? (
          /* Guests: show Auto Save row as locked with a note */
          <SettingRow iconName="save" label={t('settings.advanced.autoSave')} description={t('settings.advanced.autoSaveDesc')}>
            <div className="flex items-center gap-2">
              <Icon name="lock" size={14} className="text-zinc-500 shrink-0" />
              <span className="text-[11px] text-zinc-500 italic">
                {t('settings.advanced.autoSaveGuestNote')}
              </span>
            </div>
          </SettingRow>
        ) : (
          <>
            <SettingRow iconName="save" label={t('settings.advanced.autoSave')} description={t('settings.advanced.autoSaveDesc')}>
              <Toggle
                id="toggle-auto-save"
                checked={settings.advanced?.autoSave?.enabled ?? false}
                onChange={handleAutoSaveToggle}
              />
            </SettingRow>

            {settings.advanced?.autoSave?.enabled && (
              <SettingRow
                iconName="timer"
                label={t('settings.advanced.autoSaveInterval')}
                description={t('settings.advanced.autoSaveIntervalDesc')}
              >
                <Select
                  value={String(settings.advanced?.autoSave?.timeInterval ?? 30)}
                  onValueChange={(val) => handleAutoSaveTimeIntervalChange({ target: { value: val } })}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="5">{t('settings.advanced.autoSaveSeconds', { count: 5 })}</SelectItem>
                    <SelectItem value="10">{t('settings.advanced.autoSaveSeconds', { count: 10 })}</SelectItem>
                    <SelectItem value="30">{t('settings.advanced.autoSaveSeconds', { count: 30 })}</SelectItem>
                    <SelectItem value="60">{t('settings.advanced.autoSaveSeconds', { count: 60 })}</SelectItem>
                    <SelectItem value="120">{t('settings.advanced.autoSaveSeconds', { count: 120 })}</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
            )}
          </>
        )}

        <SettingRow
          iconName="bolt"
          label={t('settings.advanced.autoSaveIndicatorDuration') || 'Auto-save Indicator Duration'}
          description={t('settings.advanced.autoSaveIndicatorDurationDesc') || 'How long the "Saved" indicator stays visible'}
        >
          <Select
            value={settings.advanced?.autoSaveIndicator ?? 'normal'}
            onValueChange={(val) => updateSetting('advanced.autoSaveIndicator', val)}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="short">{t('settings.options.durations.short') || 'Short'}</SelectItem>
              <SelectItem value="normal">{t('settings.options.durations.normal') || 'Normal'}</SelectItem>
              <SelectItem value="long">{t('settings.options.durations.long') || 'Long'}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow
          iconName="gpp_bad"
          label={t('settings.advanced.confirmDestructive')}
          description={t('settings.advanced.confirmDestructiveDesc')}
        >
          <Toggle
            id="toggle-confirm-destructive"
            checked={settings.advanced?.confirmDestructive ?? true}
            onChange={handleConfirmDestructiveChange}
          />
        </SettingRow>

        <SettingRow
          iconName="language"
          label={t('settings.advanced.timezone') || 'Timezone'}
          description={t('settings.advanced.timezoneDesc') || 'Override detected timezone for saved timestamps'}
        >
          <Select
            value={settings.advanced?.timezone ?? 'auto'}
            onValueChange={(val) => handleTimezoneChange({ target: { value: val } })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 max-w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="auto">
                {t('settings.advanced.timezoneAuto') || 'Auto'} ({Intl.DateTimeFormat().resolvedOptions().timeZone})
              </SelectItem>
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>{tz.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
      </Section>

      {!isGuest && (
        <Section title={t('settings.advanced.dangerZone') || 'Danger Zone'} iconName="warning" searchTerm={searchTerm}>
          <SettingRow
            iconName="person_remove"
            label={t('settings.advanced.deactivate') || 'Deactivate Account'}
            description={t('settings.advanced.deactivateDesc') || 'Permanently deactivate your account. This action cannot be undone.'}
          >
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeactivate}
              disabled={isDeactivating}
              className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 hover:text-red-400 font-semibold h-8"
            >
              {isDeactivating ? 'Deactivating...' : (t('settings.advanced.deactivateBtn') || 'Deactivate')}
            </Button>
          </SettingRow>
        </Section>
      )}
    </>
  );
}
