import { useTranslation } from 'react-i18next';
import ClientOnlyDate from '@shared/ui/ClientOnlyDate';
import useInputMethod from '@/shared/hooks/useInputMethod';

export default function AdminAuditTab({ auditLogs }) {
  const { t } = useTranslation();
  const inputMethod = useInputMethod();
  const isMobile = inputMethod === 'touch';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className={isMobile ? 'flex-1 overflow-y-auto custom-scrollbar' : 'flex-1 overflow-x-auto custom-scrollbar'}>
        {auditLogs.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-zinc-500">{t('admin.table.noAuditLogs')}</div>
        ) : isMobile ? (
          // Mobile card layout
          <div className="flex flex-col gap-3 p-4">
            {auditLogs.map(log => (
              <div key={log._id} className="bg-zinc-800/30 rounded-lg p-4 flex flex-col gap-2 border border-zinc-700/50">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="text-xs font-semibold text-zinc-400">{t('admin.table.date')}</p>
                    <p className="text-xs text-zinc-500">
                      <ClientOnlyDate date={log.createdAt} />
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-zinc-400">{t('admin.table.admin')}</p>
                    <p className="text-xs font-semibold text-primary">{log.adminName}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-400 mb-1">{t('admin.table.action')}</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                    log.action.includes('ban') ? 'bg-red-500/10 text-red-400' :
                    log.action.includes('unban') || log.action.includes('reactivate') ? 'bg-emerald-500/10 text-emerald-400' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {log.action.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-400 mb-1">{t('admin.table.target')}</p>
                  <p className="text-xs text-zinc-200">{log.targetName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-400 mb-1">{t('admin.table.details')}</p>
                  <p className="text-xs text-zinc-500 break-words">{log.details}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Desktop table layout
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-zinc-900 shadow-sm border-b border-zinc-800 z-10">
              <tr>
                <th className="p-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest whitespace-nowrap">{t('admin.table.date')}</th>
                <th className="p-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest whitespace-nowrap">{t('admin.table.admin')}</th>
                <th className="p-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest whitespace-nowrap">{t('admin.table.action')}</th>
                <th className="p-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest whitespace-nowrap">{t('admin.table.target')}</th>
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
                    <span className="text-xs font-semibold text-primary whitespace-nowrap">{log.adminName}</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap inline-block ${log.action.includes('ban') ? 'bg-red-500/10 text-red-400' :
                        log.action.includes('unban') || log.action.includes('reactivate') ? 'bg-emerald-500/10 text-emerald-400' :
                          'bg-zinc-800 text-zinc-400'
                      }`}>
                      {log.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-xs text-zinc-200 whitespace-nowrap">{log.targetName || '—'}</span>
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
