import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@ui/button';

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const status = searchParams.get('status');   // 'success' | 'error' | null
  const code = searchParams.get('code');       // 'invalid_token' | 'missing_token' | 'token_expired' | 'server_error' | null

  useEffect(() => {
    if (!token || status) return;
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    fetch(`${apiBase}/auth/verify-email?token=${encodeURIComponent(token)}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) navigate('/verify-email?status=success', { replace: true });
        else navigate(`/verify-email?status=error&code=${data.error || 'server_error'}`, { replace: true });
      })
      .catch(() => navigate('/verify-email?status=error&code=server_error', { replace: true }));
  }, [token, status, navigate]);

  // Verifying — either have a token (redirecting to server) or no params at all
  if (!status) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-400">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 text-center">
        <CheckCircle2 className="size-14 text-primary" />
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-zinc-100">{t('auth.verification.landingSuccess')}</h1>
          <p className="text-sm text-zinc-400">{t('auth.verification.landingSuccessDesc')}</p>
        </div>
        <Button onClick={() => navigate('/settings')} className="rounded-xl h-10 font-bold px-6">
          {t('auth.verification.goToSettings')}
        </Button>
      </div>
    );
  }

  // Error state — pick message by code
  const getMessage = () => {
    if (code === 'missing_token' || code === 'invalid_token') return t('auth.verification.landingErrorInvalid');
    if (code === 'token_expired') return t('auth.verification.landingErrorExpired');
    return t('auth.verification.landingErrorGeneric');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 text-center">
      <XCircle className="size-14 text-red-400" />
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-zinc-100">{t('auth.verification.landingError')}</h1>
        <p className="text-sm text-zinc-400">{getMessage()}</p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate('/')} className="rounded-xl h-10 font-bold px-6">
          {t('auth.verification.goToHome')}
        </Button>
        <Button onClick={() => navigate('/settings')} className="rounded-xl h-10 font-bold px-6">
          {t('auth.verification.goToSettings')}
        </Button>
      </div>
    </div>
  );
}
