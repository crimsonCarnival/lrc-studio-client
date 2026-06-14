import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { auth } from '@/app/api';
import PasswordStrength from './components/PasswordStrength.jsx';
import toast from 'react-hot-toast';

export default function ChangePasswordPage() {
  const { t } = useTranslation();
  const { user, logout, setUser } = useAuthContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fromPasswordReset = searchParams.get('from') === 'password-reset';
  const isSetMode = searchParams.get('mode') === 'set' || !user?.hasPassword;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError(t('auth.changePassword.errorMismatch'));
      setSubmitting(false);
      return;
    }

    if (newPassword.length < 8) {
      setError(t('auth.changePassword.errorMinLength'));
      setSubmitting(false);
      return;
    }

    try {
      if (isSetMode) {
        await auth.setPassword({ newPassword, confirmPassword });
      } else {
        await auth.changePassword({ currentPassword, newPassword, confirmPassword });
      }

      setSuccess(true);
      toast.success(isSetMode 
        ? t('auth.passwordManagement.setSuccess')
        : t('auth.changePassword.success')
      );
      setTimeout(async () => {
        if (!isSetMode) {
          await logout();
          navigate('/auth/signin');
        } else {
          try {
            const freshUser = await auth.me();
            setUser(freshUser);
          } catch {
            // navigation still proceeds even if refresh fails
          }
          navigate(fromPasswordReset ? '/' : -1);
        }
      }, 2000);
    } catch (err) {
      setError(err.message || t('common.networkError'));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full p-8 bg-zinc-900 rounded-lg border border-zinc-800 text-center space-y-4">
          <div className="text-emerald-500 text-4xl">✓</div>
          <h1 className="text-2xl font-semibold text-zinc-100">
            {isSetMode ? t('auth.passwordManagement.setPasswordTitle') : t('auth.changePassword.success')}
          </h1>
          <p className="text-zinc-400">
            {isSetMode ? t('auth.passwordManagement.setSuccessMessage') : t('auth.changePassword.successMessage')}
          </p>
          <p className="text-sm text-zinc-500">
            {isSetMode
              ? t('auth.changePassword.redirectingBack')
              : t('auth.changePassword.redirecting')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="max-w-md w-full p-8 bg-zinc-900 rounded-lg border border-zinc-800 space-y-6">
        <h1 className="text-2xl font-semibold text-center text-zinc-100">
          {isSetMode ? t('auth.passwordManagement.setPasswordTitle') : t('auth.changePassword.title')}
        </h1>

        {isSetMode && (
          <p className="text-sm text-zinc-500 text-center">
            {t('auth.passwordManagement.setPasswordDesc')}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isSetMode && (
            <div>
              <input
                type="password"
                placeholder={t('auth.changePassword.currentPassword')}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={submitting}
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-600 disabled:opacity-50 focus:outline-none focus:border-primary/50"
              />
            </div>
          )}

          <div>
            <input
              type="password"
              placeholder={t('auth.changePassword.newPassword')}
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
              placeholder={t('auth.changePassword.confirmPassword')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={submitting}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-600 disabled:opacity-50 focus:outline-none focus:border-primary/50"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-destructive text-xs font-medium mt-1">
                {t('auth.changePassword.errorMismatch')}
              </p>
            )}
          </div>

          {error && <p className="text-destructive text-xs font-medium">{error}</p>}

          <button
            type="submit"
            disabled={submitting || (!isSetMode && !currentPassword) || newPassword.length < 8}
            className="w-full h-11 bg-primary hover:bg-primary-dim text-zinc-950 font-bold text-sm rounded-xl disabled:opacity-40 transition-all duration-200 mt-1"
          >
            {submitting 
              ? (isSetMode ? t('auth.passwordManagement.setting') : t('auth.changePassword.changing'))
              : (isSetMode ? t('auth.passwordManagement.setPassword') : t('auth.changePassword.button'))}
          </button>
        </form>

        <button
          onClick={() => {
            if (fromPasswordReset) {
              navigate('/');
            } else {
              navigate(-1);
            }
          }}
          className="w-full text-center text-zinc-400 hover:text-zinc-300 text-sm"
        >
          {fromPasswordReset ? t('common.backToHome') : t('common.goBack')}
        </button>
      </div>
    </div>
  );
}
