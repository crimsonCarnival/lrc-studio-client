import { useTranslation } from 'react-i18next';
import { Users, Activity, BarChart3, Music, FileText, Ban, Trash2 } from 'lucide-react';

export default function AdminStatsCards({ stats }) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4 mb-6 sm:mb-8">
      {[
        { label: t('admin.dashboard.stats.total'), value: stats?.totalUsers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { label: t('admin.dashboard.stats.active'), value: stats?.activeUsers, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { label: t('admin.table.projects'), value: stats?.totalProjects, icon: BarChart3, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
        { label: t('admin.table.uploads'), value: stats?.totalUploads, icon: Music, color: 'text-pink-400', bg: 'bg-pink-400/10' },
        { label: t('admin.dashboard.stats.appeals'), value: stats?.pendingAppeals, icon: FileText, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
        { label: t('admin.dashboard.stats.banned'), value: stats?.bannedUsers, icon: Ban, color: 'text-red-400', bg: 'bg-red-400/10' },
        { label: t('admin.dashboard.stats.deleted'), value: stats?.deletedUsers, icon: Trash2, color: 'text-zinc-500', bg: 'bg-zinc-500/10' },
      ].map((s, i) => (
        <div key={i} className="bg-zinc-900 border border-zinc-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 hover:border-zinc-700 transition-colors">
          <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${s.bg} shrink-0`}>
            <s.icon className={`size-5 sm:size-6 ${s.color}`} />
          </div>
          <div className="text-center sm:text-left min-w-0">
            <p className="text-zinc-500 text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest mb-0.5 truncate">{s.label}</p>
            <p className="text-lg sm:text-xl font-semibold text-zinc-100">{s.value ?? '—'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
