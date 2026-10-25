import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { admin } from '@/app/api';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { LogoLoader } from '@ui/LogoLoader';
import { profilePath } from '@/features/profile/profile-path';
import { projectPath } from '@/features/projects/project-path';

type TaskStatus = 'succeeded' | 'failed';
type TaskType = 'extract_lyrics' | 'infer_end_times';

interface TaskLog {
  id: string;
  jobType: TaskType;
  status: TaskStatus;
  error: string | null;
  createdAt: string;
  durationMs: number | null;
  lineCount: number | null;
  provider: string | null;
  synced: boolean | null;
  query: { track?: string; artist?: string; album?: string } | null;
  ip: string | null;
  deviceId: string | null;
  user: { id: string; accountName: string; displayName: string | null; avatarUrl: string | null } | null;
  project: { publicId: string; title: string | null; ownerAccountName: string | null } | null;
}

interface TaskPage {
  logs: TaskLog[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_SIZE = 25;

const FILTER_BTN = 'h-8 coarse:h-11 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

/** The lyrics tasks behind the dashboard's "lyrics jobs" count: who ran each, for which project, and how it ended. */
export default function AdminTasksView() {
  const { t, i18n } = useTranslation();
  const tk = t as (key: string, opts?: Record<string, unknown>) => string;
  const [status, setStatus] = useState<'' | TaskStatus>('');
  const [jobType, setJobType] = useState<'' | TaskType>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TaskPage | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(PAGE_SIZE) };
      if (status) params.status = status;
      if (jobType) params.jobType = jobType;
      setData(await admin.getJobLogs(params) as TaskPage);
    } catch {
      toast.error(t('admin.toast.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [page, status, jobType, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const pickStatus = (next: '' | TaskStatus) => { setStatus(next); setPage(1); };
  const pickType = (next: '' | TaskType) => { setJobType(next); setPage(1); };
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const when = (iso: string) => new Date(iso).toLocaleString(i18n.resolvedLanguage || i18n.language);

  const chip = (active: boolean) => `${FILTER_BTN} ${active ? 'bg-primary/15 text-primary' : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'}`;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-zinc-200">{t('admin.tasks.title')}</h2>
        <p className="text-xs text-zinc-500">{t('admin.tasks.description')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div role="group" aria-label={t('admin.tasks.statusFilter')} className="flex items-center gap-1.5">
          {([['', t('admin.tasks.all')], ['succeeded', t('admin.tasks.succeeded')], ['failed', t('admin.tasks.failed')]] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={status === value} onClick={() => pickStatus(value)} className={chip(status === value)}>{label}</button>
          ))}
        </div>
        <div role="group" aria-label={t('admin.tasks.typeFilter')} className="flex items-center gap-1.5">
          {([['', t('admin.tasks.all')], ['extract_lyrics', t('admin.tasks.type.extract_lyrics')], ['infer_end_times', t('admin.tasks.type.infer_end_times')]] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={jobType === value} onClick={() => pickType(value)} className={chip(jobType === value)}>{label}</button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-16"><LogoLoader size={28} /></div>
      ) : !data || data.logs.length === 0 ? (
        <p className="py-12 text-center text-xs text-zinc-500">{t('admin.tasks.empty')}</p>
      ) : (
        <div className={`overflow-x-auto rounded-xl border border-zinc-800/60 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[56rem] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-950/40 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                <th className="p-3">{t('admin.tasks.col.when')}</th>
                <th className="p-3">{t('admin.tasks.col.task')}</th>
                <th className="p-3">{t('admin.tasks.col.user')}</th>
                <th className="p-3">{t('admin.tasks.col.project')}</th>
                <th className="p-3">{t('admin.tasks.col.details')}</th>
                <th className="p-3">{t('admin.tasks.col.origin')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {data.logs.map(log => {
                const ok = log.status === 'succeeded';
                const song = [log.query?.track, log.query?.artist].filter(Boolean).join(' — ');
                const projectLink = log.project?.ownerAccountName ? projectPath({ publicId: log.project.publicId }, log.project.ownerAccountName) : null;
                return (
                  <tr key={log.id} className="align-top hover:bg-zinc-800/20">
                    <td className="p-3 whitespace-nowrap text-zinc-400 tabular-nums">{when(log.createdAt)}</td>
                    <td className="p-3">
                      <div className="font-medium text-zinc-200">{t(`admin.tasks.type.${log.jobType}`)}</div>
                      <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        <Icon name={ok ? 'check' : 'close'} size={10} />
                        {t(ok ? 'admin.tasks.succeeded' : 'admin.tasks.failed')}
                      </span>
                    </td>
                    <td className="p-3">
                      {log.user
                        ? <Link to={profilePath(log.user.accountName)} className="text-zinc-200 hover:text-primary transition-colors">{log.user.displayName || log.user.accountName}</Link>
                        : <span className="text-zinc-600">{t('admin.tasks.anonymous')}</span>}
                    </td>
                    <td className="p-3">
                      {log.project
                        ? projectLink
                          ? <Link to={projectLink} className="text-zinc-200 hover:text-primary transition-colors">{log.project.title || log.project.publicId}</Link>
                          : <span className="text-zinc-400">{log.project.title || log.project.publicId}</span>
                        : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="p-3 text-zinc-400">
                      {song && <div className="text-zinc-300">{song}</div>}
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                        {log.provider && <span>{tk('admin.tasks.provider', { name: log.provider })}</span>}
                        {log.synced != null && <span>{t(log.synced ? 'admin.tasks.synced' : 'admin.tasks.plain')}</span>}
                        {log.lineCount != null && <span>{tk('admin.tasks.lines', { count: log.lineCount })}</span>}
                        {log.durationMs != null && <span>{log.durationMs} ms</span>}
                      </div>
                      {log.error && <div className="mt-0.5 font-mono text-[11px] text-red-400">{log.error}</div>}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-zinc-500">
                      <div>{log.ip ?? '—'}</div>
                      {log.deviceId && <div className="max-w-[10rem] truncate" title={log.deviceId}>{log.deviceId}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">{tk('admin.tasks.total', { count: data.total })}</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label={t('admin.xp.levelsPrev')}>
              <Icon name="chevron_left" size={16} />
            </Button>
            <span className="min-w-12 text-center text-xs tabular-nums text-zinc-400">{page} / {pageCount}</span>
            <Button type="button" variant="outline" size="icon" disabled={page >= pageCount} onClick={() => setPage(page + 1)} aria-label={t('admin.xp.levelsNext')}>
              <Icon name="chevron_right" size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
