import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { Button } from '@ui/button';

export default function PasswordSection() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const getLastChangedDate = () => {
    if (!user?.passwordChangedAt) return null;
    const date = new Date(user.passwordChangedAt);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString(i18n.resolvedLanguage || i18n.language);
  };

  const lastChanged = getLastChangedDate();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between bg-secondary/30 border border-border rounded-xl px-3 min-h-11 py-2 gap-3">
        <span className="text-sm text-muted-foreground">
          {user?.hasPassword
            ? lastChanged
              ? t('auth.passwordManagement.lastChanged', { date: lastChanged })
              : t('auth.passwordManagement.button')
            : t('auth.passwordManagement.noPasswordSet')}
        </span>
        {user?.hasPassword && (
          <button
            type="button"
            onClick={() => navigate('/auth?tab=forgot')}
            className="text-[11px] text-primary hover:underline shrink-0"
          >
            {t('auth.passwordManagement.forgotPasswordLink')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mt-1">
        <Button
          size="sm"
          onClick={() => navigate(user?.hasPassword ? '/change-password?from=password-reset' : '/change-password?mode=set')}
          className="rounded-lg h-7 text-[11px] font-bold shrink-0"
        >
          {user?.hasPassword
            ? t('auth.passwordManagement.button')
            : t('auth.passwordManagement.setPassword')}
        </Button>
        {!user?.hasPassword && (
          <span className="size-2 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
