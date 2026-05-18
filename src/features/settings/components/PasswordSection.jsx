import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/features/auth/useAuthContext';

export default function PasswordSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const getLastChangedDate = () => {
    if (!user?.passwordChangedAt) {
      return t('auth.passwordManagement.never', 'Never');
    }
    const date = new Date(user.passwordChangedAt);
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-zinc-100">{t('auth.passwordManagement.title', 'Password Management')}</h3>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            {user?.hasPassword ? (
              <>
                <span className="text-zinc-400">{t('auth.passwordManagement.lastChanged', 'Last changed: {{date}}', { date: getLastChangedDate() })}</span>
                <button
                  onClick={() => navigate('/change-password?from=password-reset')}
                  className="px-4 py-2 bg-primary hover:bg-primary-dim text-zinc-950 rounded-lg font-medium"
                >
                  {t('auth.passwordManagement.button', 'Change Password')}
                </button>
              </>
            ) : (
              <>
                <span className="text-zinc-400">{t('auth.passwordManagement.noPasswordSet', 'No password set — you sign in with Google')}</span>
                <button
                  onClick={() => navigate('/change-password?mode=set')}
                  className="px-4 py-2 bg-primary hover:bg-primary-dim text-zinc-950 rounded-lg font-medium"
                >
                  {t('auth.passwordManagement.setPassword', 'Set a password')}
                </button>
              </>
            )}
          </div>

          {user?.hasPassword && (
            <button
              onClick={() => navigate('/auth?tab=forgot')}
              className="text-primary hover:underline text-sm"
            >
              {t('auth.passwordManagement.forgotPasswordLink', 'Forgot Password?')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
