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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between ml-1">
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {t('auth.passwordManagement.title')}
          </label>
          {!user?.hasPassword && (
            <span className="size-2 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
          )}
        </div>
        {user?.hasPassword && lastChanged && (
          <span className="text-[10px] text-muted-foreground/70">
            {t('auth.passwordManagement.lastChanged', { date: lastChanged })}
          </span>
        )}
      </div>

      <div className={`flex items-center justify-between gap-3 bg-secondary/30 border border-border rounded-xl px-3 h-11`}>
        <span className="text-sm text-foreground truncate">
          {user?.hasPassword
            ? t('auth.passwordManagement.button')
            : t('auth.passwordManagement.noPasswordSet')}
        </span>
        <Button
          size="sm"
          onClick={() => navigate(user?.hasPassword ? '/change-password?from=password-reset' : '/change-password?mode=set')}
          className="shrink-0 rounded-lg h-7 text-[11px] font-bold"
        >
          {user?.hasPassword
            ? t('auth.passwordManagement.button')
            : t('auth.passwordManagement.setPassword')}
        </Button>
      </div>

      {user?.hasPassword && (
        <button
          type="button"
          onClick={() => navigate('/auth?tab=forgot')}
          className="text-[11px] text-primary hover:underline ml-1"
        >
          {t('auth.passwordManagement.forgotPasswordLink')}
        </button>
      )}
    </div>
  );
}
