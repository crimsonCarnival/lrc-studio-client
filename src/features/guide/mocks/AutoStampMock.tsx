import { useTranslation } from 'react-i18next';
import { SAMPLE_LINES } from '../demos/sample-lines';

const PANEL = 'rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex flex-col gap-2';
const BADGE = 'rounded-pill border px-2.5 py-0.5 text-xs font-semibold';

// The three windows a run goes through: working, the result summary, and the overwrite confirmation.
export default function AutoStampMock() {
  const { t } = useTranslation();
  return (
    <div aria-hidden="true" className="grid gap-3 sm:grid-cols-3">
      <div className={PANEL}>
        <span className="text-sm font-semibold text-zinc-100">{t('editor.autoStamp.phaseTranscribing')}</span>
        <span className="h-1.5 rounded-pill bg-zinc-800 overflow-hidden"><span className="block h-full w-3/5 rounded-pill bg-primary" /></span>
        <span className="mt-1 inline-flex h-8 w-fit items-center rounded-lg border border-zinc-700 px-3 text-xs text-zinc-300">{t('editor.autoStamp.cancel')}</span>
      </div>
      <div className={PANEL}>
        <span className="text-sm font-semibold text-zinc-100">{t('editor.autoStamp.completedTitle')}</span>
        <span className="flex flex-wrap gap-1.5">
          <span className={`${BADGE} border-success/40 bg-success/10 text-success`}>{t('editor.autoStamp.summaryMatched', { count: 5 })}</span>
          <span className={`${BADGE} border-warning/40 bg-warning/10 text-warning`}>{t('editor.autoStamp.summaryLow', { count: 1 })}</span>
        </span>
        <span className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-subtle">{t('editor.autoStamp.uncertainLines')}</span>
        <span className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1.5 text-xs">
          <span className="font-mono text-zinc-500">#5</span>
          <span className="min-w-0 flex-1 truncate text-zinc-300">{String(t(SAMPLE_LINES[4].key as never))}</span>
          <span className="font-mono text-warning">62%</span>
        </span>
      </div>
      <div className={PANEL}>
        <span className="text-sm font-semibold text-zinc-100">{t('editor.autoStamp.confirmOverwriteTitle')}</span>
        <span className="text-xs text-zinc-400">{t('editor.autoStamp.confirmOverwriteBody', { count: 3 })}</span>
        <span className="mt-1 flex justify-end gap-2 text-xs">
          <span className="inline-flex h-8 items-center rounded-lg border border-zinc-700 px-3 text-zinc-300">{t('editor.autoStamp.discard')}</span>
          <span className="inline-flex h-8 items-center rounded-lg bg-primary px-3 font-semibold text-zinc-950">{t('editor.autoStamp.apply')}</span>
        </span>
      </div>
    </div>
  );
}
