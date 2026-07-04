import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useSettings } from '@/features/settings/useSettings';
import { formatInTimezone } from '@/shared/utils/date';

export default function AccountNameHistory() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthContext();
  const { settings } = useSettings();

  if (!user?.previousAccountNames?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-zinc-500">
        <Icon name="history" size={40} className="mb-3 opacity-20" />
        <p className="text-xs">{t('profile.noHistory')}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {user.previousAccountNames.map((entry) => (
        <li key={entry.changedAt} className="text-xs text-zinc-400 flex flex-col gap-0.5">
          <span className="text-zinc-200">
            {t('profile.changedFrom', { from: entry.from, to: entry.to })}
          </span>
          <span className="text-zinc-500">
            {formatInTimezone(entry.changedAt, settings.advanced?.timezone, {
              year: 'numeric', month: 'short', day: 'numeric'
            }, i18n.resolvedLanguage || i18n.language)}
          </span>
        </li>
      ))}
    </ul>
  );
}
