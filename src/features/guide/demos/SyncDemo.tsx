import { useReducer, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { formatTimestamp } from '@/shared/utils/lrc';
import { useDemoClock } from './useDemoClock';
import { SAMPLE_DURATION, SAMPLE_LINES } from './sample-lines';
import { initialSyncDemoState, syncDemoReducer } from './sync-demo.state';

const LINES = SAMPLE_LINES.slice(0, 4);
const BTN = 'h-11 min-w-11 px-4 inline-flex items-center justify-center gap-2 rounded-pill border border-zinc-700 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

// Sandbox of the sync loop: a fake playhead, Mark / Space stamps the active line and advances.
export default function SyncDemo() {
  const { t } = useTranslation();
  const { time, playing, play, pause, reset: resetClock, ref } = useDemoClock({ duration: SAMPLE_DURATION });
  const [state, dispatch] = useReducer(syncDemoReducer, LINES.length, initialSyncDemoState);

  const mark = () => dispatch({ type: 'mark', time });
  const reset = () => { resetClock(); dispatch({ type: 'reset' }); };
  // Only when the demo itself has focus: a Space on an inner button must stay that button's click.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || (e.key !== ' ' && e.key !== 'Enter')) return;
    e.preventDefault();
    mark();
  };

  return (
    <div
      ref={ref}
      role="group"
      aria-label={t('guide.demo.syncLabel')}
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
      <ol className="flex flex-col gap-2">
        {LINES.map((line, i) => {
          const stamp = state.stamps[i];
          const active = i === state.active;
          return (
            <li
              key={line.key}
              data-stamped={stamp !== null}
              aria-current={active ? 'step' : undefined}
              className={`flex items-center gap-3 min-h-11 px-3 rounded-lg ${active ? 'bg-zinc-800 border border-dashed border-zinc-700' : 'bg-zinc-800/50'}`}
            >
              <span className={`shrink-0 rounded-pill border px-2.5 py-0.5 font-mono text-xs tabular-nums ${stamp !== null ? 'bg-primary/25 border-primary/50 text-primary' : 'border-zinc-700 text-subtle'}`}>
                {stamp !== null ? formatTimestamp(stamp) : '--:--.--'}
              </span>
              <span className={`min-w-0 truncate text-sm ${active ? 'font-semibold text-zinc-100' : 'text-zinc-300'}`}>{t(line.key as never)}</span>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        onClick={mark}
        className="h-14 rounded-pill bg-primary text-zinc-950 text-[17px] font-bold select-none touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {t('guide.demo.mark')}
      </button>
      <p className="text-xs text-subtle">{t('guide.demo.syncHint')}</p>
    </div>
  );
}
