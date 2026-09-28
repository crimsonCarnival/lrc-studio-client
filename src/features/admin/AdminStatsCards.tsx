import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { Tip } from '@ui/tip';

interface AdminStats {
  totalUsers?: number;
  activeUsers?: number;
  activeUserNames?: string[];
  totalProjects?: number;
  totalUploads?: number;
  pendingAppeals?: number;
  bannedUsers?: number;
  deletedUsers?: number;
  newSignups24h?: number;
  newSignups7d?: number;
  newSignups30d?: number;
  totalStorage?: number;
  jobHealth?: {
    succeeded: number;
    failed: number;
  };
}

function formatBytes(bytes = 0) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function AdminStatsCards({ stats }: { stats?: AdminStats }) {
  const { t } = useTranslation();

  const activeNames = stats?.activeUserNames ?? [];
  const activeCount = stats?.activeUsers ?? 0;
  // The server caps the sample, so a busy day shows the most recent ones plus a
  // count of the rest rather than an unbounded list.
  const activeTip: ReactNode = activeNames.length > 0
    ? (
      <span className="block max-w-[220px] text-left">
        {activeNames.join(', ')}
        {activeCount > activeNames.length
          ? ` ${t('admin.dashboard.stats.activeMore', { count: activeCount - activeNames.length })}`
          : ''}
      </span>
    )
    : t('admin.dashboard.stats.activeTip');

  const cells: { label: string; value: ReactNode; color: string; tip?: ReactNode }[] = [
    { label: t('admin.dashboard.stats.total'),   value: stats?.totalUsers,     color: 'text-blue-400' },
    { label: t('admin.dashboard.stats.active'),  value: stats?.activeUsers,    color: 'text-emerald-400', tip: activeTip },
    { label: t('admin.table.projects'),           value: stats?.totalProjects,  color: 'text-indigo-400' },
    { label: t('admin.table.uploads'),            value: stats?.totalUploads,   color: 'text-pink-400' },
    { label: t('admin.dashboard.stats.appeals'), value: stats?.pendingAppeals, color: 'text-yellow-400' },
    { label: t('admin.dashboard.stats.banned'),  value: stats?.bannedUsers,    color: 'text-red-400' },
    { label: t('admin.dashboard.stats.deleted'), value: stats?.deletedUsers,   color: 'text-zinc-400' },
    { label: t('admin.dashboard.stats.signups'), value: `${stats?.newSignups24h || 0}/${stats?.newSignups7d || 0}/${stats?.newSignups30d || 0}`, color: 'text-violet-400', tip: t('admin.dashboard.stats.signupsTip') },
    { label: t('admin.dashboard.stats.storage'), value: formatBytes(stats?.totalStorage), color: 'text-amber-400', tip: t('admin.dashboard.stats.storageTip') },
    { label: t('admin.dashboard.stats.jobs'), value: `${stats?.jobHealth?.succeeded || 0}✓/${stats?.jobHealth?.failed || 0}✗`, color: 'text-rose-400', tip: t('admin.dashboard.stats.jobsTip') },
  ];

  return (
    <div className="flex items-stretch bg-zinc-900/60 border border-zinc-800/60 rounded-xl mb-5 overflow-hidden contrast-more:border-zinc-600">
      {cells.map((cell, i) => {
        const body = (
          <div className="flex flex-col items-center justify-center flex-1 py-4 px-2 gap-1 relative h-full">
            {i > 0 && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-8 bg-zinc-800/70 contrast-more:bg-zinc-600" />
            )}
            <span className={`font-heading text-xl sm:text-2xl font-bold leading-none tabular-nums ${cell.color}`}>
              {cell.value ?? '—'}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 contrast-more:text-zinc-200 text-center leading-tight">
              {cell.label}
            </span>
          </div>
        );
        return cell.tip
          ? <Tip key={i} content={cell.tip}>{body}</Tip>
          : <div key={i} className="flex flex-1">{body}</div>;
      })}
    </div>
  );
}
