import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { admin } from '../../api';
import { X, Activity, RefreshCw, CheckCircle2, AlertCircle, Ban } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';

export default function RequestLogger({ open, onClose, mode = 'portal' }) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = async () => {
    try {
      const data = await admin.getLogs();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  };

  useEffect(() => {
    if (mode === 'portal' && !open) return;
    
    fetchLogs();
    
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [open, autoRefresh, mode]);

  if (mode === 'portal' && !open) return null;

  const StatusIcon = ({ code }) => {
    if (code >= 500) return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (code >= 400) return <Ban className="w-4 h-4 text-orange-500" />;
    return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  };

  const content = (
    <div className={`flex flex-col h-full bg-zinc-950 font-mono text-xs ${mode === 'portal' ? 'fixed inset-y-0 right-0 w-[600px] border-l border-zinc-800/80 shadow-2xl z-50 transform transition-transform duration-300' : 'relative w-full'}`}>
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-zinc-100">{t('admin.logger.title')}</h2>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer hover:text-zinc-300">
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-indigo-500 focus:ring-indigo-500/50"
            />
            {t('admin.logger.autoRefresh')}
          </label>
          <Button variant="ghost" size="icon-sm" onClick={fetchLogs} disabled={autoRefresh}>
            <RefreshCw className={`w-4 h-4 text-zinc-400 ${autoRefresh ? 'animate-spin' : ''}`} />
          </Button>
          {mode === 'portal' && (
            <>
              <div className="w-px h-4 bg-zinc-800 mx-1" />
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="w-4 h-4 text-zinc-400" />
              </Button>
            </>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-0">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-zinc-950 border-b border-zinc-800/80 z-10">
            <tr>
              <th className="p-2 text-zinc-500 font-medium">{t('admin.logger.status')}</th>
              <th className="p-2 text-zinc-500 font-medium">{t('admin.logger.method')}</th>
              <th className="p-2 text-zinc-500 font-medium">{t('admin.logger.url')}</th>
              <th className="p-2 text-zinc-500 font-medium">{t('admin.logger.time')}</th>
              <th className="p-2 text-zinc-500 font-medium">{t('admin.logger.userIp')}</th>
              <th className="p-2 text-zinc-500 font-medium text-right">{t('admin.logger.timestamp')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/30">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-zinc-600">{t('admin.logger.noLogs')}</td>
              </tr>
            ) : logs.map(log => (
              <LogRow key={log.id} log={log} StatusIcon={StatusIcon} t={t} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (mode === 'portal') return createPortal(content, document.body);
  return content;
}

function LogRow({ log, StatusIcon, t }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <>
      <tr onClick={() => setExpanded(!expanded)} className="hover:bg-zinc-900 transition-colors cursor-pointer">
        <td className="p-2 pl-4 flex items-center gap-2">
          <StatusIcon code={log.statusCode} />
          <span className={log.statusCode >= 400 ? 'text-red-300' : 'text-emerald-300'}>{log.statusCode}</span>
        </td>
        <td className="p-2">
          <span className={`font-bold ${log.method === 'GET' ? 'text-blue-400' : log.method === 'POST' ? 'text-green-400' : log.method === 'DELETE' ? 'text-red-400' : 'text-yellow-400'}`}>
            {log.method}
          </span>
        </td>
        <td className="p-2 text-zinc-300 truncate max-w-md" title={log.url}>{log.url}</td>
        <td className="p-2 text-zinc-400">{log.responseTime}ms</td>
        <td className="p-2 text-zinc-500 truncate max-w-[150px]">
          {log.userId === 'anonymous' ? <span className="text-zinc-600">{t('admin.logger.anon')}</span> : log.userId}
        </td>
        <td className="p-2 text-zinc-500 text-right pr-4">
          {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, second: '2-digit', fractionalSecondDigits: 3 })}
        </td>
      </tr>
      {expanded && (log.reqBody || log.resBody) && (
        <tr className="bg-zinc-950">
          <td colSpan={6} className="p-4 border-b border-zinc-800/50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-zinc-500 font-semibold mb-1 uppercase tracking-widest text-[10px]">{t('admin.logger.reqBody')}</p>
                <pre className="bg-zinc-900 p-2 rounded border border-zinc-800 text-[10px] text-zinc-300 overflow-auto max-h-40">
                  {log.reqBody ? JSON.stringify(log.reqBody, null, 2) : t('admin.logger.noBody')}
                </pre>
              </div>
              <div>
                <p className="text-zinc-500 font-semibold mb-1 uppercase tracking-widest text-[10px]">{t('admin.logger.resBody')}</p>
                <pre className="bg-zinc-900 p-2 rounded border border-zinc-800 text-[10px] text-zinc-300 overflow-auto max-h-40">
                  {log.resBody ? JSON.stringify(log.resBody, null, 2) : t('admin.logger.noBody')}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
