import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Section, SettingRow, Toggle, SettingSelect, SettingOption } from '../shared';
import { useAdvancedSettings } from '../../hooks/useAdvancedSettings';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { useAuthContext } from '@/features/auth/useAuthContext';

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
  const { user, deactivateAccount } = useAuthContext();
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const {
    handleAutoSaveToggle,
    handleAutoSaveTimeIntervalChange,
    handleConfirmDestructiveChange,
    handleTimezoneChange,
  } = useAdvancedSettings(updateSetting);

  const handle = user?.accountName ?? '';
  // Typing the handle is the guard against an accidental, irreversible deactivation.
  const confirmed = !!handle && typed.trim() === handle;
  const autoSaveOn = settings.advanced?.autoSave?.enabled ?? false;

  const handleDeactivate = async () => {
    if (!confirmed) return;
    try {
      setIsDeactivating(true);
      await deactivateAccount();
      toast.success(t('settings.advanced.deactivateSuccess'));
    } catch (err) {
      console.error(err);
      toast.error(t('settings.advanced.deactivateError'));
      setIsDeactivating(false);
    }
  };

  return (
    <>
      <Section title={t('settings.advanced.saveSection')} searchTerm={searchTerm}>
        {isGuest ? (
          <SettingRow label={t('settings.advanced.autoSave')} description={t('settings.advanced.autoSaveDesc')}>
            <div className="flex items-center gap-2">
              <Icon name="lock" size={14} className="text-zinc-500 shrink-0" />
              <span className="text-xs text-zinc-500 italic">{t('settings.advanced.autoSaveGuestNote')}</span>
            </div>
          </SettingRow>
        ) : (
          <>
            <SettingRow label={t('settings.advanced.autoSave')} description={t('settings.advanced.autoSaveDesc')}>
              <Toggle id="toggle-auto-save" label={t('settings.advanced.autoSave')} checked={autoSaveOn} onChange={handleAutoSaveToggle} />
            </SettingRow>
            {autoSaveOn && (
              <SettingRow nested label={t('settings.advanced.autoSaveInterval')} description={t('settings.advanced.autoSaveIntervalDesc')}>
                <SettingSelect
                  label={t('settings.advanced.autoSaveInterval')}
                  value={String(settings.advanced?.autoSave?.timeInterval ?? 30)}
                  onValueChange={(val) => handleAutoSaveTimeIntervalChange({ target: { value: val } })}
                >
                  {[5, 10, 30, 60, 120].map((n) => (
                    <SettingOption key={n} value={String(n)}>{t('settings.advanced.autoSaveSeconds', { count: n })}</SettingOption>
                  ))}
                </SettingSelect>
              </SettingRow>
            )}
          </>
        )}

        <SettingRow label={t('settings.advanced.autoSaveIndicatorDuration')} description={t('settings.advanced.autoSaveIndicatorDurationDesc')}>
          <SettingSelect
            label={t('settings.advanced.autoSaveIndicatorDuration')}
            value={settings.advanced?.autoSaveIndicator ?? 'normal'}
            onValueChange={(val) => updateSetting('advanced.autoSaveIndicator', val)}
          >
            <SettingOption value="short">{t('settings.options.durations.short')}</SettingOption>
            <SettingOption value="normal">{t('settings.options.durations.normal')}</SettingOption>
            <SettingOption value="long">{t('settings.options.durations.long')}</SettingOption>
          </SettingSelect>
        </SettingRow>

        <SettingRow label={t('settings.advanced.confirmDestructive')} description={t('settings.advanced.confirmDestructiveDesc')}>
          <Toggle id="toggle-confirm-destructive" label={t('settings.advanced.confirmDestructive')} checked={settings.advanced?.confirmDestructive ?? true} onChange={handleConfirmDestructiveChange} />
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
      </Section>

      {!isGuest && (
        <Section title={t('settings.advanced.dangerZone')} tone="danger" searchTerm={searchTerm}>
          <SettingRow label={t('settings.advanced.deactivate')} description={t('settings.advanced.deactivateDesc')}>
            {!confirming && (
              <Button
                variant="outline"
                onClick={() => setConfirming(true)}
                className="h-11 rounded-[10px] border-red-900/60 bg-transparent text-red-300 hover:bg-red-950/40 font-semibold"
              >
                {t('settings.advanced.deactivateBtn')}
              </Button>
            )}
          </SettingRow>
          {confirming && (
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-red-950 bg-red-950/20 p-[18px]">
              <label htmlFor="deactivate-confirm" className="text-sm">
                {t('settings.advanced.deactivateTypeHandle')} <b className="font-mono">{handle}</b>
              </label>
              <Input
                id="deactivate-confirm"
                autoComplete="off"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="max-w-80 bg-zinc-950 border-zinc-700 rounded-[10px] h-11"
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => { setConfirming(false); setTyped(''); }} className="h-10 rounded-[10px] border-zinc-700 bg-transparent">
                  {t('common.cancel')}
                </Button>
                <Button
                  disabled={!confirmed || isDeactivating}
                  onClick={handleDeactivate}
                  className="h-10 rounded-[10px] font-bold bg-red-600 text-white hover:bg-red-500 disabled:bg-red-950 disabled:text-red-300/50"
                >
                  {isDeactivating ? t('settings.advanced.deactivating') : t('settings.advanced.deactivateConfirmBtn')}
                </Button>
              </div>
            </div>
          )}
        </Section>
      )}
    </>
  );
}
