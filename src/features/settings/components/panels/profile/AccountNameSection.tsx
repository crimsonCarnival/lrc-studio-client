import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@ui/input';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { ACCOUNT_NAME_RE } from './useProfileDraft';

const COOLDOWN_DAYS = 7;

type AccountNameSectionProps = {
  value: string;
  /** Server-side rejection (taken, cooldown) from the last save attempt. */
  error: string;
  onChange: (value: string) => void;
};

export default function AccountNameSection({ value, error: serverError, onChange }: AccountNameSectionProps) {
  const { t } = useTranslation();
  const { user } = useAuthContext();

  // Capture mount time once — cooldown accuracy at day granularity, mount time is sufficient
  const [mountNow] = useState(() => Date.now());
  const accountNameCooldownDaysLeft = (() => {
    if (!user?.lastAccountNameChangedAt) return 0;
    const elapsed = (mountNow - new Date(user.lastAccountNameChangedAt).getTime()) / (1000 * 60 * 60 * 24);
    const remaining = COOLDOWN_DAYS - elapsed;
    return remaining > 0 ? Math.ceil(remaining) : 0;
  })();

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_.:-]/g, ''));
  }

  const inputId = 'settings-account-name';
  const error = serverError || (value && !ACCOUNT_NAME_RE.test(value) ? t('profile.accountNameInvalid') : '');

  return (
    <div>
      <label htmlFor={inputId} className="block text-[13px] font-bold text-zinc-100 mb-2">
        {t('profile.accountName')}
      </label>
      <div>
        <Input
          id={inputId}
          value={value}
          onChange={handleChange}
          placeholder={t('profile.accountNamePlaceholder')}
          disabled={accountNameCooldownDaysLeft > 0}
          maxLength={30}
          className={`bg-zinc-950 border border-zinc-700 rounded-[10px] h-11 text-[15px] ${accountNameCooldownDaysLeft > 0 ? 'opacity-50 cursor-not-allowed' : ''} ${error ? 'border-red-500/50 focus-visible:ring-red-500/50' : ''}`}
        />
      </div>
      {error ? (
        <p className="text-[13px] text-red-400 mt-1.5">{error}</p>
      ) : (
        <p className="text-[13px] text-zinc-400 mt-1.5">
          {window.location.host}/{value || '…'} · {accountNameCooldownDaysLeft > 0
            ? t('profile.accountNameCooldown', { days: accountNameCooldownDaysLeft })
            : t('profile.accountNameChangeEvery', { days: COOLDOWN_DAYS })}
        </p>
      )}
    </div>
  );
}
