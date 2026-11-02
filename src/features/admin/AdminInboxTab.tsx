import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { userHasPermission } from '@/features/auth/permissions';
import { useSettings } from '@/features/settings/useSettings';
import { formatTimeAgo } from '@/features/notifications/time-ago';
import { listReportGroups } from '@/features/reports/reports.service';
import type { ReportGroup } from '@/features/reports/reports.service';
import { LogoLoader } from '@ui/LogoLoader';
import { adminPath } from './admin-nav';
import { AppealAvatar } from './AdminAppealsTab';
import { InboxIcon, InboxRow, InboxSectionLabel } from './InboxRow';
import { useReportCount } from './report-count';
import { requestsApi, type StaffRequest } from './services/requests.service';
import type { PendingAppeal } from './admin.types';

/** Rows per section; the rest are one click away in the section's own tab. */
const SECTION_CAP = 5;

/** What a report group is about, in a few words. */
function reportSubject(g: ReportGroup): string {
  if (g.targetType === 'user') return g.user?.displayName || g.user?.accountName || '';
  if (g.targetType === 'project') return g.project?.title ?? '';
  if (g.targetType === 'playlist') return g.playlist?.name ?? '';
  return g.comment?.comment.author?.accountName ?? '';
}

/**
 * Everything waiting on this moderator, in the layout of the notification dropdown: ban appeals,
 * open reports and staff proposals to review. Each row leads to the place where it is handled.
 */
export default function AdminInboxTab({ appeals }: { appeals: PendingAppeal[] }) {
  const { t, i18n } = useTranslation();
  const tk = t as (k: string, o?: Record<string, unknown>) => string;
  const { settings } = useSettings();
  const { user } = useAuthContext();
  const canModerate = userHasPermission(user?.permissions, 'users.ban');
  const openReports = useReportCount(canModerate);

  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [proposals, setProposals] = useState<StaffRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Reload whenever the open-report count changes (the server pushes it as the queue moves).
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const caps = await requestsApi.capabilities();
        const [g, p] = await Promise.all([
          canModerate ? listReportGroups('open') : Promise.resolve([]),
          caps.reviewable.length > 0 ? requestsApi.pending() : Promise.resolve([]),
        ]);
        if (!live) return;
        setGroups(g);
        setProposals(p);
      } catch {
        // The Reports and Requests tabs surface their own load errors; an empty section is enough here.
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [canModerate, openReports]);

  const ago = (iso: string) => formatTimeAgo(iso, t, settings.advanced?.timezone, i18n.resolvedLanguage || i18n.language);
  const empty = appeals.length === 0 && groups.length === 0 && proposals.length === 0;

  if (loading && empty) return <div className="flex justify-center py-12"><LogoLoader /></div>;
  if (empty) return <p className="px-4 py-12 text-center text-[15px] text-subtle">{t('admin.inbox.empty')}</p>;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-0.5 p-2">
      {appeals.length > 0 && (
        <>
          <InboxSectionLabel>{t('admin.inbox.appeals', { count: appeals.length })}</InboxSectionLabel>
          {appeals.slice(0, SECTION_CAP).map(a => (
            <InboxRow
              key={a.id}
              leading={<AppealAvatar appeal={a} />}
              to={`${adminPath('appeals')}?open=${a.id}`}
              meta={a.appeal.submittedAt ? ago(a.appeal.submittedAt) : undefined}
            >
              <strong>{a.displayName || a.accountName}</strong> {t('admin.appeals.row', { reason: a.ban.reason || t('admin.table.noReason') })}
            </InboxRow>
          ))}
          {appeals.length > SECTION_CAP && <MoreLink to={adminPath('appeals')} count={appeals.length - SECTION_CAP} />}
        </>
      )}

      {groups.length > 0 && (
        <>
          <InboxSectionLabel>{t('admin.inbox.reports', { count: groups.length })}</InboxSectionLabel>
          {groups.slice(0, SECTION_CAP).map(g => (
            <InboxRow
              key={`${g.targetType}:${g.targetId}`}
              leading={<InboxIcon name="flag" />}
              to={adminPath('reports')}
              meta={ago(g.latestAt)}
            >
              {tk(`admin.inbox.reportOn.${g.targetType}`, { subject: reportSubject(g), count: g.openCount })}
            </InboxRow>
          ))}
          {groups.length > SECTION_CAP && <MoreLink to={adminPath('reports')} count={groups.length - SECTION_CAP} />}
        </>
      )}

      {proposals.length > 0 && (
        <>
          <InboxSectionLabel>{t('admin.inbox.proposals', { count: proposals.length })}</InboxSectionLabel>
          {proposals.slice(0, SECTION_CAP).map(p => (
            <InboxRow
              key={p.id}
              leading={<InboxIcon name="inbox" />}
              to={adminPath('requests')}
              meta={p.createdAt ? ago(p.createdAt) : undefined}
            >
              <strong>{p.requesterName}</strong> · {p.summary}
            </InboxRow>
          ))}
          {proposals.length > SECTION_CAP && <MoreLink to={adminPath('requests')} count={proposals.length - SECTION_CAP} />}
        </>
      )}
    </div>
  );
}

function MoreLink({ to, count }: { to: string; count: number }) {
  const { t } = useTranslation();
  return <InboxRow to={to} leading={<span className="size-9 shrink-0" aria-hidden="true" />}>{t('admin.inbox.more', { count })}</InboxRow>;
}
