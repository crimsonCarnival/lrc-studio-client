import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useSettings } from '@/features/settings/useSettings';
import { formatInTimezone } from '@/shared/utils/date';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { IconRow } from './shared';

export default function PasswordSection() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { settings } = useSettings();

  const getLastChangedDate = () => {
    if (!user?.passwordChangedAt) return null;
    const date = new Date(user.passwordChangedAt);
    if (isNaN(date.getTime())) return null;
    return formatInTimezone(date, settings.advanced?.timezone, {}, i18n.resolvedLanguage || i18n.language);
  };

  const lastChanged = getLastChangedDate();

  return (
    <IconRow
      icon={<Icon name="lock" size={20} />}
      title={t('profile.sections.password')}
      description={user?.hasPassword
        ? lastChanged
          ? t('auth.passwordManagement.lastChanged', { date: lastChanged })
          : t('profile.privacy.passwordDesc')
        : t('auth.passwordManagement.noPasswordSet')}
    >
      {user?.hasPassword && (
        <Link to="/auth?tab=forgot" className="text-[13px] text-primary underline">
          {t('auth.passwordManagement.forgotPasswordLink')}
        </Link>
      )}
      <Button
        variant="outline"
        onClick={() => navigate(user?.hasPassword ? '/change-password?from=password-reset' : '/change-password?mode=set')}
        className="h-11 rounded-[10px] border-zinc-700 bg-transparent text-zinc-100 font-semibold"
      >
        {user?.hasPassword ? t('auth.passwordManagement.button') : t('auth.passwordManagement.setPassword')}
        {!user?.hasPassword && <span className="size-2 rounded-full bg-amber-400" aria-hidden="true" />}
      </Button>
    </IconRow>
  );
}
