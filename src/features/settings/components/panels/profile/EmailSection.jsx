import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import toast from 'react-hot-toast';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthContext } from '@/features/auth/useAuthContext';

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
    } catch (err) {
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
    } catch (err) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 ml-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
          {t('profile.emailSection')}
        </label>
        {user?.email && (!user?.isVerified || user?.pendingEmail) && (
          <span className="size-2 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
        )}
      </div>

      <Input
        type="email"
        value={value}
        onChange={(e) => { setValue(e.target.value); setError(''); }}
        placeholder={t('profile.email')}
        className="bg-secondary/30 border-border rounded-xl h-10 text-sm"
      />
      {error && <p className="text-[11px] text-red-400 ml-1">{error}</p>}

      {user?.pendingEmail ? (
        <div className="flex items-center gap-2 text-[11px] text-amber-500/90 ml-1">
          <span>{t('auth.verification.pendingNotice', { email: user.pendingEmail })}</span>
          <button onClick={handleResend} disabled={resending} className="underline hover:no-underline font-semibold shrink-0">
            {resending ? t('auth.verification.resendLoading') : t('auth.verification.resendButton')}
          </button>
        </div>
      ) : user?.email && !user?.isVerified ? (
        <div className="flex items-center gap-2 text-[11px] text-amber-500/90 ml-1">
          <span>{t('auth.verification.unverifiedNotice')}</span>
          <button onClick={handleResend} disabled={resending} className="underline hover:no-underline font-semibold shrink-0">
            {resending ? t('auth.verification.resendLoading') : t('auth.verification.resendButton')}
          </button>
        </div>
      ) : null}

      <Button
        onClick={handleSave}
        disabled={saving || !!error || value === (user?.email || '') || value === (user?.pendingEmail || '')}
        className="h-9 rounded-xl font-bold gap-2 text-sm"
        size="sm"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {t('profile.save')}
      </Button>

      <div id="section-email-history" className="space-y-1.5 pt-2 border-t border-border scroll-mt-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          {t('profile.sections.emailHistory')}
        </p>
        {user?.emailHistory?.length > 0 ? (
          <ul className="space-y-1">
            {user.emailHistory.map((entry, i) => (
              <li key={i} className="text-[11px] text-muted-foreground ml-1 flex items-center gap-1">
                <span>{t('profile.changedFrom', { from: entry.from, to: entry.to })}</span>
                <span className="text-muted-foreground/50">•</span>
                <span>{new Date(entry.changedAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-muted-foreground/50 ml-1">{t('profile.noHistory')}</p>
        )}
      </div>
    </div>
  );
}
