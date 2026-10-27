import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { LogoLoader } from '@ui/LogoLoader';
import { useSettings } from '@/features/settings/useSettings';
import { formatTimeAgo } from '@/features/notifications/time-ago';
import { listMyReports } from './reports.service';
import type { MyReport, ReportStatus } from './reports.service';
import { ReportTargetPreview } from './ReportTargetPreview';

const PAGE_SIZE = 20;

const STATUS_STYLE: Record<ReportStatus, string> = {
  open:      'bg-amber-500/15 text-amber-400 border-amber-500/30',
  dismissed: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  actioned:  'bg-primary/15 text-primary border-primary/30',
};

function MyReportRow({ report }: { report: MyReport }) {
  const { t, i18n } = useTranslation();
  const tk = t as (k: string, o?: Record<string, unknown>) => string;
  const { settings } = useSettings();
  const ago = (when: string) => formatTimeAgo(when, t, settings.advanced?.timezone, i18n.language);

  return (
    <li className="flex flex-col gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/60">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          {tk(`reports.preview.type.${report.targetType}`)}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${STATUS_STYLE[report.status]}`}>
          {tk(`reports.page.status.${report.status}`)}
        </span>
      </div>
      <ReportTargetPreview
        targetType={report.targetType}
        comment={report.comment}
        user={report.user}
        project={report.project}
        playlist={report.playlist}
      />
      <div className="flex flex-col gap-1 text-[11px] text-zinc-500">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-semibold">{tk(`reports.reasons.${report.reason}`)}</span>
          <span>{t('reports.page.filed', { time: ago(report.createdAt) })}</span>
          {report.resolvedAt && <span>{t('reports.page.reviewed', { time: ago(report.resolvedAt) })}</span>}
        </p>
        {report.note && <p className="text-zinc-400">{t('reports.page.note', { note: report.note })}</p>}
      </div>
    </li>
  );
}

/** The signed-in user's reports and what became of each, newest first. */
export default function MyReportsPage() {
  const { t } = useTranslation();
  const [reports, setReports] = useState<MyReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const page = await listMyReports(PAGE_SIZE, 0);
      setReports(page.reports);
      setTotal(page.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const page = await listMyReports(PAGE_SIZE, reports.length);
      // A report filed meanwhile shifts the offsets; drop any row already shown.
      setReports(prev => [...prev, ...page.reports.filter(r => !prev.some(p => p.id === r.id))]);
      setTotal(page.total);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full px-4 py-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{t('reports.page.title')}</h1>
          <p className="text-sm text-zinc-500">{t('reports.page.subtitle')}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><LogoLoader size={32} /></div>
        ) : error && reports.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-zinc-500">{t('reports.page.loadError')}</p>
            <Button type="button" variant="outline" size="sm" onClick={load}>{t('reports.page.retry')}</Button>
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-zinc-500 py-12 text-center">{t('reports.page.empty')}</p>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {reports.map(r => <MyReportRow key={r.id} report={r} />)}
            </ul>
            {reports.length < total && (
              <Button type="button" variant="outline" size="sm" className="self-center" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? <LogoLoader size={12} /> : t('reports.page.loadMore')}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
