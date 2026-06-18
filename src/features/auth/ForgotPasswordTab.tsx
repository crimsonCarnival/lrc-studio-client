import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

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
        <button
          onClick={() => {
            setSuccess(false);
            setEmail('');
          }}
          className="text-blue-400 hover:underline mt-4"
        >
          {t('auth.forgotPasswordForm.sendAnother')}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      {onBackToLogin && (
        <button
          type="button"
          onClick={onBackToLogin}
          className="flex items-center gap-2 mb-6 text-sm font-semibold text-zinc-500 hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-4" />
          {t('auth.backToLogin')}
        </button>
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

        <button
          type="submit"
          disabled={loading || !email}
          className="h-11 bg-primary hover:bg-primary-dim text-zinc-950 font-bold text-sm rounded-xl disabled:opacity-40 transition-all duration-200"
        >
          {loading ? t('auth.forgotPasswordForm.sending') : t('auth.forgotPasswordForm.button')}
        </button>
      </form>
    </div>
  );
}
