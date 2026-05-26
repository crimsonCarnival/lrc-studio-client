import { useTranslation } from 'react-i18next';
import { Mailbox } from 'lucide-react';
import { useAuthContext } from '@/features/auth/useAuthContext';

export default function EmailHistory() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthContext();

  if (!user?.emailHistory?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-zinc-500">
        <Mailbox className="size-10 mb-3 opacity-20" strokeWidth={1} />
        <p className="text-xs">{t('profile.noHistory', 'No changes yet')}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {user.emailHistory.map((entry) => (
        <li key={entry.changedAt} className="text-xs text-zinc-400 flex flex-col gap-0.5">
          <span className="text-zinc-200">
            {t('profile.changedFrom', { from: entry.from, to: entry.to })}
          </span>
          <span className="text-zinc-500">
            {new Date(entry.changedAt).toLocaleDateString(i18n.language, {
              year: 'numeric', month: 'short', day: 'numeric'
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}
