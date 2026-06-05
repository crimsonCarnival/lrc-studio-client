import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Save, Clock } from 'lucide-react';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import toast from 'react-hot-toast';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthContext } from '@/features/auth/useAuthContext';

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

  function handleChange(e) {
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
    } catch (err) {
      const ext = err?.graphqlErrors?.[0]?.extensions;
      const code = ext?.code;
      if (code === 'accountName_change_cooldown') {
        setError(t('profile.accountNameCooldownError', { days: ext?.daysLeft ?? accountNameCooldownDaysLeft ?? COOLDOWN_DAYS }));
      } else if (code === 'accountName_taken' || err?.message?.includes('already taken')) {
        setError(t('profile.accountNameTaken'));
      } else {
        setError(err?.message || t('profile.saveError'));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between ml-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {t('profile.accountNameSection')}
        </label>
        {accountNameCooldownDaysLeft > 0 && (
          <span className="text-[10px] text-amber-500/80 flex items-center gap-1">
            <Clock className="size-3" />
            {t('profile.accountNameCooldown', { days: accountNameCooldownDaysLeft })}
          </span>
        )}
      </div>

      <div className={`flex items-stretch rounded-xl border overflow-hidden transition-colors ${error ? 'border-red-500/50' : 'border-border focus-within:border-primary/60'} ${accountNameCooldownDaysLeft > 0 ? 'opacity-50' : ''}`}>
        <span className="flex items-center px-3 text-muted-foreground text-sm bg-muted/40 select-none border-r border-border shrink-0">@</span>
        <Input
          value={value}
          onChange={handleChange}
          placeholder={t('profile.accountNamePlaceholder')}
          disabled={accountNameCooldownDaysLeft > 0}
          maxLength={30}
          className={`bg-secondary/30 border-0 rounded-none h-10 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 ${accountNameCooldownDaysLeft > 0 ? 'cursor-not-allowed' : ''}`}
        />
      </div>
      {error && <p className="text-[11px] text-red-400 ml-1">{error}</p>}

      <Button
        onClick={handleSave}
        disabled={saving || !!error || value === (user?.accountName || '') || accountNameCooldownDaysLeft > 0}
        className="h-9 rounded-xl font-bold gap-2 text-sm"
        size="sm"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {t('profile.save')}
      </Button>

    </div>
  );
}
