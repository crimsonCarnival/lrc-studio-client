import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion as M, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { LogoLoader } from '@ui/LogoLoader';
import { Button } from '@ui/button';
import { InitialsAvatar } from '@/shared/ui/InitialsAvatar';
import { useSettings } from '@/features/settings/useSettings';
import { formatTimeAgo } from '@/features/notifications/time-ago';
import { profilePath } from '@/features/profile/profile-path';
import CommentBody from '@/features/profile/wall/CommentBody';
import { listWallReports, resolveWallReport, wallErrorKey } from '@/features/profile/wall/wall.service';
import type { WallAuthor, WallReport } from '@/features/profile/wall/wall.service';

const STATUSES = ['open', 'dismissed', 'actioned'] as const satisfies readonly WallReport['status'][];

const STATUS_STYLE: Record<WallReport['status'], string> = {
  open:      'bg-amber-500/15 text-amber-400 border-amber-500/30',
  dismissed: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  actioned:  'bg-red-500/15 text-red-400 border-red-500/30',
};

const nameOf = (user: WallAuthor) => user.displayName || user.accountName;

function AuthorLink({ user }: { user: WallAuthor }) {
  return (
    <Link to={profilePath(user.accountName)} className="inline-flex items-center gap-1.5 font-medium text-zinc-200 hover:text-primary transition-colors">
      {user.avatarUrl
        ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-5 rounded-full object-cover" />
        : <InitialsAvatar name={nameOf(user)} handle={user.accountName} className="size-5 rounded-full text-[9px]" />}
      {nameOf(user)}
    </Link>
  );
}

function ReportRow({ report, busy, onResolve }: { report: WallReport; busy: boolean; onResolve: (action: 'dismiss' | 'delete') => void }) {
  const { t, i18n } = useTranslation();
  const tk = t as (k: string, o?: Record<string, unknown>) => string;
  const { settings } = useSettings();
  const ago = (when: string) => formatTimeAgo(when, t, settings.advanced?.timezone, i18n.language);
  const { comment } = report;

  return (
    <M.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/60"
    >
      {comment ? (
        <div className="flex flex-col gap-1.5">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
            {comment.author ? <AuthorLink user={comment.author} /> : <span className="italic">{t('admin.reports.unknownUser')}</span>}
            <span>{ago(comment.createdAt)}</span>
            <Link
              to={`${profilePath(report.wallAccountName)}#comment-${comment.id}`}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Icon name="open_in_new" size={12} /> {t('admin.reports.viewComment', { name: report.wallAccountName })}
            </Link>
          </p>
          <p className="text-sm text-zinc-200 whitespace-pre-wrap break-words">
            <CommentBody comment={comment} />
          </p>
        </div>
      ) : (
        <p className="text-sm italic text-zinc-500">{t('admin.reports.commentGone')}</p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 min-w-0 flex flex-col gap-1 text-[11px] text-zinc-500">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-semibold">
              {tk(`profile.wall.reportReasons.${report.reason}`)}
            </span>
            <span className="inline-flex items-center gap-1">
              {t('admin.reports.reportedBy')}
              {report.reporter ? <AuthorLink user={report.reporter} /> : <span className="italic">{t('admin.reports.unknownUser')}</span>}
            </span>
            <span>{ago(report.createdAt)}</span>
            {report.status === 'open' && report.openCount > 1 && (
              <span className="text-amber-400 font-semibold">{tk('admin.reports.openCount', { count: report.openCount })}</span>
            )}
          </p>
          {report.note && <p className="text-zinc-400">{t('admin.reports.note', { note: report.note })}</p>}
        </div>

        {report.status === 'open' ? (
          <div className="flex items-center justify-end gap-1.5 shrink-0">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onResolve('dismiss')}>
              <Icon name="check" size={12} /> {t('admin.reports.dismiss')}
            </Button>
            {comment && (
              <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => onResolve('delete')}>
                <Icon name="delete" size={12} /> {t('admin.reports.deleteComment')}
              </Button>
            )}
          </div>
        ) : (
          <span className={`shrink-0 self-end px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${STATUS_STYLE[report.status]}`}>
            {tk(`admin.reports.status.${report.status}`)}
          </span>
        )}
      </div>
    </M.div>
  );
}

/** Reported wall comments, for moderators (users.ban). */
export default function AdminReportsTab() {
  const { t } = useTranslation();
  const tk = t as (k: string, o?: Record<string, unknown>) => string;
  const [status, setStatus] = useState<WallReport['status']>('open');
  const [reports, setReports] = useState<WallReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // `quiet` refreshes without the loader, after a resolve.
  const fetchReports = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      setReports(await listWallReports(status));
    } catch (err) {
      toast.error(tk(wallErrorKey(err)));
    } finally {
      setLoading(false);
    }
  }, [status, tk]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReports();
  }, [fetchReports]);

  const resolve = async (report: WallReport, action: 'dismiss' | 'delete') => {
    setBusy(report.id);
    try {
      await resolveWallReport(report.id, action);
      toast.success(t(action === 'delete' ? 'admin.reports.deleted' : 'admin.reports.dismissed'));
      // The server settles every open report of the same comment (and, on a delete, of its replies).
      const commentId = report.comment?.id;
      setReports(prev => prev.filter(r => r.id !== report.id && !(commentId && r.comment?.id === commentId)));
      fetchReports(true);
    } catch (err) {
      toast.error(tk(wallErrorKey(err)));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div role="tablist" className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
          {STATUSES.map(s => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={status === s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${status === s ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {tk(`admin.reports.filter.${s}`)}
            </button>
          ))}
        </div>
        <Button type="button" variant="outline" size="icon" onClick={() => fetchReports()} aria-label={t('admin.reports.refresh')}>
          <Icon name="refresh" size={14} />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LogoLoader size={32} />
        </div>
      ) : reports.length === 0 ? (
        <p className="text-sm text-zinc-500 py-12 text-center">{tk(`admin.reports.empty.${status}`)}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {reports.map(report => (
              <ReportRow key={report.id} report={report} busy={busy === report.id} onResolve={action => resolve(report, action)} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
