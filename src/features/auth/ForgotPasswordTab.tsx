import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { Button } from '@ui/button';

export default function ForgotPasswordTab({ onBackToLogin }: { onBackToLogin?: () => void }) {
  const { t } = useTranslation();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let recaptchaToken: string | undefined = undefined;
      if (executeRecaptcha) {
        recaptchaToken = await executeRecaptcha('forgot_password');
      }

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, recaptchaToken }),
      });

      if (response.status === 429) {
        setError(t('auth.forgotPasswordForm.errorTooMany'));

        return;
      }

      if (!response.ok) {
        setError(t('auth.forgotPasswordForm.errorFailed'));
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(t('auth.forgotPasswordForm.errorNetwork'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-green-500 text-5xl">✓</div>
        <p className="text-zinc-300">{t('auth.forgotPasswordForm.success')}</p>
        <p className="text-sm text-zinc-500">{t('auth.forgotPasswordForm.validFor')}</p>
        <Button
          variant="link"
          size={null}
          onClick={() => {
            setSuccess(false);
            setEmail('');
          }}
          className="mt-4 text-base"
        >
          {t('auth.forgotPasswordForm.sendAnother')}
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      {onBackToLogin && (
        <Button
          type="button"
          variant="link"
          size={null}
          onClick={onBackToLogin}
          className="mb-6 flex w-fit gap-2 text-sm text-zinc-500 hover:text-primary"
        >
          <Icon name="arrow_back" size={16} />
          {t('auth.backToLogin')}
        </Button>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight font-heading">
          {t('auth.forgotPasswordForm.title')}
        </h1>
        <p className="text-sm text-zinc-500 mt-1.5">
          {t('auth.forgotPasswordForm.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <input
            type="email"
            placeholder={t('auth.forgotPasswordForm.placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-600 disabled:opacity-50 focus:outline-none focus:border-primary/50 transition-colors"
          />
          {error && <p className="text-destructive text-xs font-medium mt-1">{error}</p>}
        </div>

        <Button
          type="submit"
          disabled={loading || !email}
          className="h-[52px] text-[17px] lg:h-[52px] lg:text-[17px]"
        >
          {loading ? t('auth.forgotPasswordForm.sending') : t('auth.forgotPasswordForm.button')}
        </Button>
      </form>
    </div>
  );
}
