import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/features/settings/useSettings';
import { formatTimeAgo } from '@/features/notifications/time-ago';
import { InitialsAvatar } from '@/shared/ui/InitialsAvatar';
import { LazyImage } from '@ui/LazyImage';
import { InboxRow } from './InboxRow';
import type { PendingAppeal } from './admin.types';

/** The avatar of the appealing user, or their initial when they have none. */
export function AppealAvatar({ appeal }: { appeal: PendingAppeal }) {
  return appeal.avatarUrl
    ? <LazyImage src={appeal.avatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
    : <InitialsAvatar name={appeal.displayName} handle={appeal.accountName} className="size-9 shrink-0 rounded-full text-sm" />;
}

type AdminAppealsTabProps = {
  appeals: PendingAppeal[];
  onOpen: (appeal: PendingAppeal) => void;
};

/** Ban appeals waiting on a decision. A row opens the review dialog; `?open=<userId>` opens one directly. */
export default function AdminAppealsTab({ appeals, onOpen }: AdminAppealsTabProps) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const [params, setParams] = useSearchParams();

  const wanted = params.get('open');
  useEffect(() => {
    if (!wanted) return;
    const match = appeals.find(a => a.id === wanted);
    if (!match) return;
    onOpen(match);
    setParams({}, { replace: true });
    // onOpen is a fresh closure each render; the match and the param are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, appeals]);

  if (appeals.length === 0) {
    return <p className="px-4 py-12 text-center text-[15px] text-subtle">{t('admin.appeals.empty')}</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-0.5 p-2">
      {appeals.map(a => (
        <InboxRow
          key={a.id}
          leading={<AppealAvatar appeal={a} />}
          onClick={() => onOpen(a)}
          meta={a.appeal.submittedAt ? formatTimeAgo(a.appeal.submittedAt, t, settings.advanced?.timezone, i18n.resolvedLanguage || i18n.language) : undefined}
        >
          <strong>{a.displayName || a.accountName}</strong>{' '}
          {t('admin.appeals.row', { reason: a.ban.reason || t('admin.table.noReason') })}
        </InboxRow>
      ))}
    </div>
  );
}
