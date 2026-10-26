import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import toast from 'react-hot-toast';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { LogoLoader } from '@ui/LogoLoader';
import type { ApiError } from '@/types/api/error';

const ACCOUNT_NAME_RE = /^[a-z0-9_.:-]{3,30}$/;
const COOLDOWN_DAYS = 7;

export default function AccountNameSection() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthContext();

  const [value, setValue] = useState(user?.accountName || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Capture mount time once — cooldown accuracy at day granularity, mount time is sufficient
  const [mountNow] = useState(() => Date.now());
  const accountNameCooldownDaysLeft = (() => {
    if (!user?.lastAccountNameChangedAt) return 0;
    const elapsed = (mountNow - new Date(user.lastAccountNameChangedAt).getTime()) / (1000 * 60 * 60 * 24);
    const remaining = COOLDOWN_DAYS - elapsed;
    return remaining > 0 ? Math.ceil(remaining) : 0;
  })();

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.:-]/g, '');
    setValue(val);
    if (val && !ACCOUNT_NAME_RE.test(val)) {
      setError(t('profile.accountNameInvalid'));
    } else {
      setError('');
    }
  }

  async function handleSave() {
    if (!ACCOUNT_NAME_RE.test(value)) {
      setError(t('profile.accountNameInvalid'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await authService.updateProfile({ accountName: value });
      setUser(prev => ({ ...prev, ...result }));
      toast.success(t('profile.saveSuccess'));
    } catch (e) {
      const err = e as ApiError;
      const ext = err?.graphqlErrors?.[0]?.extensions;
      const code = ext?.code;
      if (code === 'accountName_change_cooldown') {
        const daysLeft = typeof ext?.daysLeft === 'number' ? ext.daysLeft : null;
        setError(t('profile.accountNameCooldownError', { days: daysLeft ?? accountNameCooldownDaysLeft ?? COOLDOWN_DAYS }));
      } else if (code === 'accountName_taken' || err?.message?.includes('already taken')) {
        setError(t('profile.accountNameTaken'));
      } else {
        setError(err?.message || t('profile.saveError'));
      }
    } finally {
      setSaving(false);
    }
  }

  const inputId = 'settings-account-name';
  const changed = value !== (user?.accountName || '');

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
      {changed && !error && accountNameCooldownDaysLeft === 0 && (
        <Button onClick={handleSave} disabled={saving} className="h-10 coarse:h-11 rounded-xl font-bold gap-2 text-sm mt-3" size="sm">
          {saving ? <LogoLoader size={16} /> : <Icon name="save" size={16} />}
          {t('profile.save')}
        </Button>
      )}
    </div>
  );
}
