import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@/features/auth/useAuthContext';
import PasswordStrength from './components/PasswordStrength.jsx';
import { authService } from '@/features/auth/services/auth.service';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const { logout } = useAuthContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenReason, setTokenReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setValidating(false);
        setTokenReason('invalid');
        return;
      }

      try {
        const data = await authService.validateResetToken(token);

        if (data.valid) {
          setEmail(data.email);
          setTokenValid(true);
        } else {
          setTokenReason(data.reason || 'invalid');
        }
      } catch (err) {
        setTokenReason('error');
        console.error(err);
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError(t('auth.resetPassword.passwordMismatch', 'Passwords do not match'));
      setSubmitting(false);
      return;
    }

    try {
      await authService.resetPassword({
        token,
        newPassword,
        confirmPassword,
      });

      setSuccess(true);
      toast.success(t('auth.resetPassword.success', 'Password reset successfully'));
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.body?.error || 'Failed to reset password');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full size-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-zinc-400">{t('auth.resetPassword.validating', 'Validating reset link...')}</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full p-8 bg-zinc-900 rounded-lg border border-zinc-800 text-center space-y-4">
          <div className="text-destructive text-4xl">✕</div>
          <h1 className="text-2xl font-semibold text-zinc-100">{t('auth.resetPassword.errorExpired', 'Reset Link Expired')}</h1>
          <p className="text-zinc-400">
            {tokenReason === 'expired'
              ? t('auth.resetPassword.errorInvalid', 'This reset link has expired. Request a new one.')
              : t('auth.resetPassword.errorAlreadyUsed', 'Invalid or already used reset link.')}
          </p>
          <button
            onClick={() => navigate('/auth?tab=forgot')}
            className="w-full py-2 bg-primary hover:bg-primary-dim text-zinc-950 font-medium rounded"
          >
            {t('auth.resetPassword.requestNewLink', 'Request New Link')}
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full p-8 bg-zinc-900 rounded-lg border border-zinc-800 text-center space-y-4">
          <div className="text-emerald-500 text-4xl">✓</div>
          <h1 className="text-2xl font-semibold text-zinc-100">{t('auth.resetPassword.success', 'Password Reset')}</h1>
          <p className="text-zinc-400">{t('auth.resetPassword.successMessage', 'Your password has been reset successfully.')}</p>
          <p className="text-sm text-zinc-500">{t('auth.resetPassword.redirecting', 'Redirecting to login...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="max-w-md w-full p-8 bg-zinc-900 rounded-lg border border-zinc-800 space-y-6">
        <h1 className="text-2xl font-semibold text-center text-zinc-100">{t('auth.resetPassword.title', 'Reset Password')}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-400 placeholder-zinc-600 disabled:opacity-50 focus:outline-none"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder={t('auth.resetPassword.newPassword', 'New Password')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={submitting}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-600 disabled:opacity-50 focus:outline-none focus:border-primary/50"
            />
            <PasswordStrength password={newPassword} />
          </div>

          <div>
            <input
              type="password"
              placeholder={t('auth.resetPassword.confirmPassword', 'Confirm Password')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={submitting}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-600 disabled:opacity-50 focus:outline-none focus:border-primary/50"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-destructive text-xs font-medium mt-1">{t('auth.resetPassword.passwordMismatch', 'Passwords do not match')}</p>
            )}
          </div>

          {error && <p className="text-destructive text-xs font-medium">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !newPassword || newPassword.length < 8}
            className="w-full h-11 bg-primary hover:bg-primary-dim text-zinc-950 font-semibold text-sm rounded-xl disabled:opacity-40 transition-all duration-200"
          >
            {submitting ? t('auth.resetPassword.resetting', 'Resetting...') : t('auth.resetPassword.button', 'Reset Password')}
          </button>
        </form>

        <button
          onClick={() => navigate('/login')}
          className="w-full text-center text-zinc-400 hover:text-zinc-300 text-sm"
        >
          {t('auth.resetPassword.backToLogin', 'Back to login')}
        </button>
      </div>
    </div>
  );
}
