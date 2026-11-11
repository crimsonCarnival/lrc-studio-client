import { useReducer, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { formatTimestamp } from '@/shared/utils/lrc';
import { useDemoClock } from './useDemoClock';
import { SAMPLE_DURATION, SAMPLE_LINES } from './sample-lines';
import { initialSrtDemoState, srtDemoReducer } from './srt-demo.state';

const LINE = SAMPLE_LINES[0];
const BTN = 'h-11 min-w-11 px-4 inline-flex items-center justify-center gap-2 rounded-pill border border-zinc-700 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const pct = (time: number) => `${(time / SAMPLE_DURATION) * 100}%`;

// Subtitle timing: the first mark sets the start, the second the end; the bar shows the block length.
export default function SrtDemo() {
  const { t } = useTranslation();
  const { time, playing, play, pause, reset: resetClock, ref } = useDemoClock({ duration: SAMPLE_DURATION });
  const [state, dispatch] = useReducer(srtDemoReducer, initialSrtDemoState);
  const { start, end } = state;

  const mark = () => dispatch({ type: 'mark', time });
  const reset = () => { resetClock(); dispatch({ type: 'reset' }); };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || (e.key !== ' ' && e.key !== 'Enter')) return;
    e.preventDefault();
    mark();
  };
  // Until the end is marked, the block grows with the playhead.
  const barEnd = end ?? (start !== null && time > start ? time : start);

  return (
    <div
      ref={ref}
      role="group"
      aria-label={t('guide.demo.srtLabel')}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={playing ? pause : play} className={BTN}>
          <Icon name={playing ? 'pause' : 'play_arrow'} size={16} />
          {t(playing ? 'guide.demo.pause' : 'guide.demo.play')}
        </button>
        <span className="font-mono text-sm tabular-nums text-zinc-300">{formatTimestamp(time)}</span>
        <button type="button" onClick={reset} className={`${BTN} ml-auto`}>{t('guide.demo.reset')}</button>
      </div>

      <div className="flex flex-col gap-2 rounded-lg bg-zinc-800/50 p-3">
        <span className="min-w-0 truncate text-sm font-semibold text-zinc-100">{t(LINE.key as never)}</span>
        <div className="relative h-8 rounded-md bg-zinc-950">
          {start !== null && barEnd !== null && (
            <span
              data-srt-bar
              data-complete={end !== null}
              className={`absolute inset-y-1 rounded ${end !== null ? 'bg-primary/40 border border-primary/50' : 'bg-primary/20 border border-dashed border-primary/50'}`}
              style={{ left: pct(start), width: pct(barEnd - start) }}
            />
          )}
          <span aria-hidden className="absolute inset-y-0 w-0.5 bg-zinc-100" style={{ left: pct(time) }} />
        </div>
        <dl className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs tabular-nums text-zinc-300">
          <div className="flex gap-1.5"><dt className="text-subtle">{t('guide.demo.srtStart')}</dt><dd>{start !== null ? formatTimestamp(start) : '--:--.--'}</dd></div>
          <div className="flex gap-1.5"><dt className="text-subtle">{t('guide.demo.srtEnd')}</dt><dd>{end !== null ? formatTimestamp(end) : '--:--.--'}</dd></div>
          <div className="flex gap-1.5"><dt className="text-subtle">{t('guide.demo.srtLength')}</dt><dd data-srt-length>{start !== null && end !== null ? t('guide.demo.srtSeconds', { value: (end - start).toFixed(1) }) : '--'}</dd></div>
        </dl>
      </div>

      <button
        type="button"
        onClick={mark}
        className="h-14 rounded-pill bg-primary text-zinc-950 text-[17px] font-bold select-none touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {t('guide.demo.mark')}
      </button>
      <p className="text-xs text-subtle">{t('guide.demo.srtHint')}</p>
    </div>
  );
}
