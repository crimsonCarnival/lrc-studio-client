import { useTranslation } from 'react-i18next';

export default function AdminStatsCards({ stats }) {
  const { t } = useTranslation();

  const cells = [
    { label: t('admin.dashboard.stats.total'),   value: stats?.totalUsers,     color: 'text-blue-400' },
    { label: t('admin.dashboard.stats.active'),  value: stats?.activeUsers,    color: 'text-emerald-400' },
    { label: t('admin.table.projects'),           value: stats?.totalProjects,  color: 'text-indigo-400' },
    { label: t('admin.table.uploads'),            value: stats?.totalUploads,   color: 'text-pink-400' },
    { label: t('admin.dashboard.stats.appeals'), value: stats?.pendingAppeals, color: 'text-yellow-400' },
    { label: t('admin.dashboard.stats.banned'),  value: stats?.bannedUsers,    color: 'text-red-400' },
    { label: t('admin.dashboard.stats.deleted'), value: stats?.deletedUsers,   color: 'text-zinc-500' },
  ];

  return (
    <div className="flex items-stretch bg-zinc-900/60 border border-zinc-800/60 rounded-xl mb-5 overflow-hidden contrast-more:border-zinc-600">
      {cells.map((cell, i) => (
        <div key={i} className="flex flex-col items-center justify-center flex-1 py-4 px-2 gap-1 relative">
          {i > 0 && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-8 bg-zinc-800/70 contrast-more:bg-zinc-600" />
          )}
          <span className={`font-heading text-xl sm:text-2xl font-bold leading-none tabular-nums ${cell.color}`}>
            {cell.value ?? '—'}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-700 contrast-more:text-zinc-400 text-center leading-tight">
            {cell.label}
          </span>
        </div>
      ))}
    </div>
  );
}
