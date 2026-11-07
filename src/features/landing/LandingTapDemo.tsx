import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMarkTap } from '@/features/editor/components/phone/useMarkTap';
import { Icon } from '@/shared/ui/Icon';
import { DEMO_LINES, formatStamp } from './demo-lines';

/**
 * The phone landing's demo: the editor's tap-to-stamp loop in miniature. A clock runs, each
 * tap writes the running time onto the current sample line and moves to the next, like
 * the real editor. Uses the same sample lines as the desktop demo.
 *
 * The clock is a readout the user drives against, not decoration, so reduced motion does
 * not stop it; it stops by itself once every line is stamped.
 */

const TICK_MS = 100;

export default function LandingTapDemo() {
  const { t } = useTranslation();
  const [time, setTime] = useState(0);
  const [stamps, setStamps] = useState<number[]>([]);

  const total = DEMO_LINES.length;
  const done = stamps.length >= total;
  const current = done ? total - 1 : stamps.length;

  useEffect(() => {
    if (done) return;
    const startedAt = Date.now() - time * 1000;
    const id = setInterval(() => setTime((Date.now() - startedAt) / 1000), TICK_MS);
    return () => clearInterval(id);
    // `time` is read once to resume from where it stood; re-running on every tick would reset the interval.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const stamp = () => {
    if (done) return;
    setStamps((prev) => [...prev, time]);
  };
  const tap = useMarkTap(stamp, done);
  const reset = () => { setStamps([]); setTime(0); };

  const line = DEMO_LINES[current];
  const prev = current > 0 ? DEMO_LINES[current - 1] : null;
  const lastStamp = stamps.length ? stamps[stamps.length - 1] : null;
  const text = (l: (typeof DEMO_LINES)[number]) => l.w.join(l.cjk ? '' : ' ');

  return (
    <section aria-labelledby="landing-try-it" className="rounded-[calc(var(--radius)*2.2)] bg-zinc-900 border border-zinc-800 font-lyrics p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="landing-try-it" className="text-[15px] font-bold tracking-[0.08em] uppercase text-zinc-100">{t('landing.demo.tryIt')}</h2>
        <span className="font-mono text-sm tabular-nums text-foreground/80" aria-hidden="true">{formatStamp(done ? stamps[total - 1] : time)}</span>
      </div>

      <div className="flex flex-col gap-2 text-left">
        <p aria-hidden={prev ? undefined : true} className="min-h-6 flex items-baseline gap-2 text-sm text-foreground/65">
          {prev && (
            <>
              <span className="shrink-0 font-mono text-xs tabular-nums text-primary/80">{formatStamp(stamps[current - 1])}</span>
              <span lang={prev.cjk ? 'ja' : undefined} className="min-w-0 break-words">{text(prev)}</span>
            </>
          )}
        </p>
        <p className="min-h-[3.5rem] flex items-center gap-2.5 rounded-xl bg-zinc-800 border border-dashed border-zinc-700 px-3.5 py-2.5">
          <span className="shrink-0 font-mono text-xs tabular-nums text-primary">{done ? formatStamp(stamps[current]) : '--:--.--'}</span>
          <span lang={line.cjk ? 'ja' : undefined} className="min-w-0 break-words text-xl font-extrabold leading-snug text-zinc-100">{text(line)}</span>
        </p>
        <p className="text-xs font-mono text-foreground/65">{t('landing.demo.lineCount', { current: current + 1, total })}</p>
      </div>

      {done ? (
        <>
          <p role="status" className="text-sm text-zinc-100">{t('landing.demo.allStamped', { total })}</p>
          <button
            type="button"
            onClick={reset}
            className="h-12 w-full inline-flex items-center justify-center gap-2 rounded-[calc(var(--radius)*1)] border border-zinc-700 font-semibold hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors"
          >
            {t('landing.demo.tryAgain')}
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            {...tap}
            className="h-14 w-full inline-flex items-center justify-center gap-2.5 rounded-[calc(var(--radius)*1)] bg-primary active:bg-primary-dim text-primary-foreground text-base font-bold select-none touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors"
          >
            <span aria-hidden="true" className="inline-flex"><Icon name="location_on" size={18} /></span>{t('landing.demo.tapToStamp')}
          </button>
          <p role="status" className="min-h-5 text-sm text-foreground/80">
            {lastStamp != null ? t('landing.demo.stamped', { stamp: `[${formatStamp(lastStamp)}]` }) : t('landing.demo.tapHint')}
          </p>
        </>
      )}
    </section>
  );
}
