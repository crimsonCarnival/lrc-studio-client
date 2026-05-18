import { useTranslation } from 'react-i18next';
import ClientOnlyDate from '@shared/ui/ClientOnlyDate';

export default function AdminAuditTab({ auditLogs }) {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {auditLogs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">{t('admin.table.noAuditLogs')}</div>
        ) : (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-zinc-900 shadow-sm border-b border-zinc-800 z-10">
              <tr>
                <th className="p-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{t('admin.table.date')}</th>
                <th className="p-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{t('admin.table.admin')}</th>
                <th className="p-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{t('admin.table.action')}</th>
                <th className="p-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{t('admin.table.target')}</th>
                <th className="p-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{t('admin.table.details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/20">
              {auditLogs.map(log => (
                <tr key={log._id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="p-4 text-[10px] text-zinc-500 whitespace-nowrap">
                    <ClientOnlyDate date={log.createdAt} />
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-semibold text-primary">{log.adminName}</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${log.action.includes('ban') ? 'bg-red-500/10 text-red-400' :
                        log.action.includes('unban') || log.action.includes('reactivate') ? 'bg-emerald-500/10 text-emerald-400' :
                          'bg-zinc-800 text-zinc-400'
                      }`}>
                      {log.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-xs text-zinc-200">{log.targetName || '—'}</span>
                  </td>
                  <td className="p-4 text-xs text-zinc-500 max-w-xs truncate" title={log.details}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
