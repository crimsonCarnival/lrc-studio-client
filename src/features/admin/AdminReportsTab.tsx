import { useState, useEffect, useCallback } from 'react';
import { motion as M, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { LogoLoader } from '@ui/LogoLoader';
import { Button } from '@ui/button';
import ConfirmModal from '@shared/ui/ConfirmModal';
import { adminService } from './services/admin.service';
import { useSettings } from '@/features/settings/useSettings';
import { formatTimeAgo } from '@/features/notifications/time-ago';
import { listReportGroups, REPORT_TARGET_TYPES, resolveReportGroup } from '@/features/reports/reports.service';
import type { ReportGroup, ReportStatus } from '@/features/reports/reports.service';
import { PersonLink, ReportTargetPreview } from '@/features/reports/ReportTargetPreview';
import { isSudoCancelled, withSudo } from './services/sudo';
import BanUserModal from './BanUserModal';

const STATUSES = ['open', 'dismissed', 'actioned'] as const satisfies readonly ReportStatus[];
const TYPE_FILTERS = ['all', ...REPORT_TARGET_TYPES] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

const STATUS_STYLE: Record<Exclude<ReportStatus, 'open'>, string> = {
  dismissed: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  actioned:  'bg-red-500/15 text-red-400 border-red-500/30',
};

/** What the moderator chose for a group. `ban` (accounts) bans first, then marks it handled. */
type GroupAction = 'dismiss' | 'action' | 'ban';

const groupKey = (g: Pick<ReportGroup, 'targetType' | 'targetId'>) => `${g.targetType}:${g.targetId}`;

const ADMIN_REPORT_ERRORS = ['forbidden', 'not_found', 'invalid_body', 'sudo_required'] as const;

/** The i18n key for a failed resolve: its code's message, or the generic one. */
function resolveErrorKey(err: unknown): string {
  const code = ((err as { code?: string })?.code ?? '').toLowerCase();
  return `admin.reports.errors.${(ADMIN_REPORT_ERRORS as readonly string[]).includes(code) ? code : 'failed'}`;
}

/** A tab strip; the status and type filters both use it. */
function FilterTabs<T extends string>({ label, value, options, labelOf, onChange }: {
  label: string;
  value: T;
  options: readonly T[];
  labelOf: (option: T) => string;
  onChange: (option: T) => void;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
      {options.map(o => (
        <button
          key={o}
          type="button"
          role="tab"
          aria-selected={value === o}
          onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${value === o ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          {labelOf(o)}
        </button>
      ))}
    </div>
  );
}

/** The accountable user and how often their content was acted on lately. */
function SubjectRecord({ group }: { group: ReportGroup }) {
  const { t, i18n } = useTranslation();
  const tk = t as (k: string, o?: Record<string, unknown>) => string;
  if (!group.subject) return null;
  const until = group.subjectRestrictedUntil;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
      <span className="font-semibold uppercase tracking-wider">{t('admin.reports.subject')}</span>
      <PersonLink user={group.subject} />
      <span className={group.subjectActionedCount > 0 ? 'text-amber-400 font-semibold' : undefined}>
        {group.subjectActionedCount > 0
          ? tk('admin.reports.record', { count: group.subjectActionedCount })
          : t('admin.reports.recordClean')}
      </span>
      {until && (
        <span className="text-red-400">
          {until === 'forever'
            ? t('admin.reports.restrictedForever')
            : t('admin.reports.restrictedUntil', { date: new Date(until).toLocaleString(i18n.language) })}
        </span>
      )}
    </p>
  );
}

function GroupRow({ group, status, busy, onAct }: { group: ReportGroup; status: ReportStatus; busy: boolean; onAct: (action: GroupAction) => void }) {
  const { t, i18n } = useTranslation();
  const tk = t as (k: string, o?: Record<string, unknown>) => string;
  const { settings } = useSettings();
  const ago = (when: string) => formatTimeAgo(when, t, settings.advanced?.timezone, i18n.language);
  const { targetType } = group;
  // The preview is null once the target is gone: then only dismissing is left.
  const present = !!group[targetType === 'wall_comment' ? 'comment' : targetType];

  return (
    <M.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/60"
    >
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
        <span className="font-semibold uppercase tracking-widest">{tk(`reports.preview.type.${targetType}`)}</span>
        {group.openCount > 1 && <span className="text-amber-400 font-semibold">{tk('admin.reports.openCount', { count: group.openCount })}</span>}
      </p>

      <ReportTargetPreview
        targetType={targetType}
        comment={group.comment}
        user={group.user}
        project={group.project}
        playlist={group.playlist}
      />

      <SubjectRecord group={group} />

      <ul className="flex flex-col gap-2 border-t border-zinc-800/60 pt-3">
        {group.reports.map(report => (
          <li key={report.id} className="flex flex-col gap-1 text-[11px] text-zinc-500">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-semibold">
                {tk(`reports.reasons.${report.reason}`)}
              </span>
              <span className="inline-flex items-center gap-1">
                {t('admin.reports.reportedBy')}
                {report.reporter ? <PersonLink user={report.reporter} /> : <span className="italic">{t('reports.preview.unknownUser')}</span>}
              </span>
              <span>{ago(report.createdAt)}</span>
            </p>
            {report.note && <p className="text-zinc-400">{t('admin.reports.note', { note: report.note })}</p>}
          </li>
        ))}
      </ul>

      {group.openCount > 0 ? (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onAct('dismiss')}>
            <Icon name="check" size={12} /> {t('admin.reports.dismiss')}
          </Button>
          {present && targetType === 'user' && (
            <>
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onAct('action')}>
                <Icon name="done_all" size={12} /> {t('admin.reports.markHandled')}
              </Button>
              {!group.user?.banned && (
                <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => onAct('ban')}>
                  <Icon name="block" size={12} /> {t('admin.reports.ban')}
                </Button>
              )}
            </>
          )}
          {present && targetType !== 'user' && (
            <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => onAct('action')}>
              <Icon name="delete" size={12} />
              {targetType === 'wall_comment' ? t('admin.reports.deleteComment')
                : targetType === 'project' ? t('admin.reports.deleteProject')
                : t('admin.reports.deletePlaylist')}
            </Button>
          )}
        </div>
      ) : status !== 'open' && (
        <span className={`self-end px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${STATUS_STYLE[status]}`}>
          {tk(`admin.reports.outcome.${status === 'dismissed' ? 'dismissed' : targetType}`)}
        </span>
      )}
    </M.div>
  );
}

/** Reported comments, accounts, projects and playlists, one row per target, for moderators (users.ban). */
export default function AdminReportsTab() {
  const { t } = useTranslation();
  const tk = t as (k: string, o?: Record<string, unknown>) => string;
  const [status, setStatus] = useState<ReportStatus>('open');
  const [type, setType] = useState<TypeFilter>('all');
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  // A project or playlist waiting for the "delete it?" confirmation, and an account for the ban form.
  const [confirming, setConfirming] = useState<ReportGroup | null>(null);
  const [banning, setBanning] = useState<ReportGroup | null>(null);

  // `quiet` refreshes without the loader, after a resolve.
  const fetchGroups = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      setGroups(await listReportGroups(status, type === 'all' ? null : type));
    } catch (err) {
      toast.error(tk(resolveErrorKey(err)));
    } finally {
      setLoading(false);
    }
  }, [status, type, tk]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGroups();
  }, [fetchGroups]);

  /** Settle the group's open reports; deleting a project or playlist goes through sudo. */
  const resolve = async (group: ReportGroup, action: 'dismiss' | 'action', doneMessage: string) => {
    setBusy(groupKey(group));
    try {
      const run = () => resolveReportGroup(group.targetType, group.targetId, action);
      await (action === 'action' && (group.targetType === 'project' || group.targetType === 'playlist') ? withSudo(run) : run());
      toast.success(doneMessage);
      // The server settles every open report of the target (and, deleting a comment, of its replies).
      setGroups(prev => prev.filter(g => groupKey(g) !== groupKey(group)));
      fetchGroups(true);
    } catch (err) {
      if (!isSudoCancelled(err)) toast.error(tk(resolveErrorKey(err)));
    } finally {
      setBusy(null);
    }
  };

  const act = (group: ReportGroup, action: GroupAction) => {
    if (action === 'ban') setBanning(group);
    else if (action === 'dismiss') resolve(group, 'dismiss', t('admin.reports.done.dismissed'));
    else if (group.targetType === 'project' || group.targetType === 'playlist') setConfirming(group);
    else resolve(group, 'action', tk(`admin.reports.done.${group.targetType}`));
  };

  // The dashboard's own ban (sudo included), then the reports are marked as acted on.
  const onBanConfirm = async (payload: { reason: string; bannedUntil: string | null; banIp: boolean; banDevice: boolean }) => {
    const group = banning;
    setBanning(null);
    if (!group?.user) return;
    setBusy(groupKey(group));
    try {
      await adminService.banUser(group.targetId, payload);
    } catch (err) {
      setBusy(null);
      if (isSudoCancelled(err)) return;
      toast.error((err as { status?: number })?.status === 403 ? t('admin.toast.noPermission') : t('admin.toast.statusError'));
      return;
    }
    await resolve(group, 'action', t('admin.reports.done.banned', { name: group.user.displayName || group.user.accountName }));
  };

  const confirmName = confirming?.project?.title ?? confirming?.playlist?.name ?? '';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <FilterTabs<ReportStatus>
            label={t('admin.reports.statusFilter')}
            value={status}
            options={STATUSES}
            labelOf={s => tk(`admin.reports.filter.${s}`)}
            onChange={setStatus}
          />
          <FilterTabs<TypeFilter>
            label={t('admin.reports.typeFilter')}
            value={type}
            options={TYPE_FILTERS}
            labelOf={ty => tk(`admin.reports.type.${ty}`)}
            onChange={setType}
          />
        </div>
        <Button type="button" variant="outline" size="icon" onClick={() => fetchGroups()} aria-label={t('admin.reports.refresh')}>
          <Icon name="refresh" size={14} />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LogoLoader size={32} />
        </div>
      ) : groups.length === 0 ? (
        <p className="text-sm text-zinc-500 py-12 text-center">{tk(`admin.reports.empty.${status}`)}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {groups.map(group => (
              <GroupRow key={groupKey(group)} group={group} status={status} busy={busy === groupKey(group)} onAct={action => act(group, action)} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirming}
        title={confirming?.targetType === 'playlist' ? t('admin.reports.confirmDelete.playlistTitle') : t('admin.reports.confirmDelete.projectTitle')}
        message={confirming?.targetType === 'playlist'
          ? t('admin.reports.confirmDelete.playlistMessage', { name: confirmName })
          : t('admin.reports.confirmDelete.projectMessage', { name: confirmName })}
        confirmText={t('admin.reports.confirmDelete.confirm')}
        onConfirm={() => {
          const group = confirming;
          setConfirming(null);
          if (group) resolve(group, 'action', tk(`admin.reports.done.${group.targetType}`));
        }}
        onCancel={() => setConfirming(null)}
      />
      <BanUserModal
        isOpen={!!banning}
        user={banning?.user ? { accountName: banning.user.accountName, displayName: banning.user.displayName ?? undefined } : null}
        onConfirm={onBanConfirm}
        onCancel={() => setBanning(null)}
      />
    </div>
  );
}
