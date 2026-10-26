import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import toast from 'react-hot-toast';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { LogoLoader } from '@ui/LogoLoader';
import type { ApiError } from '@/types/api/error';

export default function EmailSection() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthContext();
  const [value, setValue] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedUser = await authService.updateProfile({ email: value });
      setUser(prev => ({ ...prev, ...updatedUser }));
      toast.success(t('profile.saveSuccess'));
      setError('');
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 409 || err.message?.includes('already')) {
        setError(t('auth.errors.generic'));
      } else {
        toast.error(t('profile.saveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authService.sendVerificationEmail();
      toast.success(t('auth.verification.sendSuccess'));
    } catch (e) {
      const err = e as ApiError;
      const code = err.graphqlErrors?.[0]?.extensions?.code;
      if (code === 'rate_limited' || err.status === 429) {
        toast.error(t('auth.verification.rateLimited'));
      } else if (code === 'nothing_to_verify') {
        toast.success(t('auth.verification.nothingToVerify'));
      } else {
        toast.error(t('profile.saveError'));
      }
    } finally {
      setResending(false);
    }
  };

  const verified = !!user?.email && !!user?.isVerified && !user?.pendingEmail;
  const changed = value !== (user?.email || '') && value !== (user?.pendingEmail || '');

  return (
    <section className="settings-section rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-[17px] font-bold text-zinc-100">{t('profile.emailSection')}</h2>
      <p className="text-sm text-zinc-400 mt-1.5">{t('profile.emailPrivateDesc')}</p>

      <div className="flex flex-wrap gap-2.5 mt-4">
        <label htmlFor="settings-email" className="sr-only">{t('profile.emailSection')}</label>
        <Input
          id="settings-email"
          type="email"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(''); }}
          placeholder={t('profile.email')}
          className="flex-1 basis-64 bg-zinc-950 border border-zinc-700 rounded-[10px] h-11 text-[15px]"
        />
        {user?.email && (
          <span className={`flex items-center gap-1.5 px-3 h-11 rounded-[10px] text-[13px] font-semibold ${verified ? 'bg-teal-950 text-teal-300' : 'bg-amber-950 text-amber-300'}`}>
            <Icon name={verified ? 'check' : 'schedule'} size={16} />
            {verified ? t('profile.verified') : t('profile.unverified')}
          </span>
        )}
      </div>
      {error && <p className="text-[13px] text-red-400 mt-2">{error}</p>}

      {user?.pendingEmail ? (
        <div className="flex items-center gap-2 text-[13px] text-amber-500/90 mt-3">
          <span>{t('auth.verification.pendingNotice', { email: user.pendingEmail })}</span>
          <Button variant="link" size={null} onClick={handleResend} disabled={resending} className="relative text-[13px] text-inherit underline hover:no-underline coarse:after:content-[''] coarse:after:absolute coarse:after:-inset-x-2 coarse:after:-inset-y-4">
            {resending ? t('auth.verification.resendLoading') : t('auth.verification.resendButton')}
          </Button>
        </div>
      ) : user?.email && !user?.isVerified ? (
        <div className="flex items-center gap-2 text-[13px] text-amber-500/90 mt-3">
          <span>{t('auth.verification.unverifiedNotice')}</span>
          <Button variant="link" size={null} onClick={handleResend} disabled={resending} className="relative text-[13px] text-inherit underline hover:no-underline coarse:after:content-[''] coarse:after:absolute coarse:after:-inset-x-2 coarse:after:-inset-y-4">
            {resending ? t('auth.verification.resendLoading') : t('auth.verification.resendButton')}
          </Button>
        </div>
      ) : null}

      {changed && (
        <Button onClick={handleSave} disabled={saving || !!error} className="h-10 coarse:h-11 rounded-xl font-bold gap-2 text-sm mt-3" size="sm">
          {saving ? <LogoLoader size={16} /> : <Icon name="save" size={16} />}
          {t('profile.save')}
        </Button>
      )}
    </section>
  );
}
