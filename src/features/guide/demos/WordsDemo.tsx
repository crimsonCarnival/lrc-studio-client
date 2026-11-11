import { useReducer, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { formatTimestamp } from '@/shared/utils/lrc';
import { useDemoClock } from './useDemoClock';
import { SAMPLE_DURATION, SAMPLE_LINES } from './sample-lines';
import { initialWordsDemoState, wordsDemoReducer } from './words-demo.state';

const LINES = SAMPLE_LINES.slice(0, 3);
const STAMPED_INDEX = 1;
const BTN = 'h-11 min-w-11 px-4 inline-flex items-center justify-center gap-2 rounded-pill border border-zinc-700 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const TAB = 'h-11 px-4 rounded-md text-sm text-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const TAB_ON = 'bg-zinc-800 text-zinc-100 ring-1 ring-primary';

// Two-step sandbox: Words is locked until a line is stamped, then that line splits into word chips.
export default function WordsDemo() {
  const { t } = useTranslation();
  const { time, playing, play, pause, reset: resetClock, ref, reducedMotion } = useDemoClock({ duration: SAMPLE_DURATION });
  const words = String(t(LINES[STAMPED_INDEX].key as never)).split(' ');
  const [state, dispatch] = useReducer(wordsDemoReducer, words.length, initialWordsDemoState);
  const [lockedShown, setLockedShown] = useState(false);
  const wordsMode = state.mode === 'words';

  const mark = () => dispatch(wordsMode ? { type: 'markWord', time } : { type: 'markLine', time });
  const reset = () => { resetClock(); dispatch({ type: 'reset' }); setLockedShown(false); };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || (e.key !== ' ' && e.key !== 'Enter')) return;
    e.preventDefault();
    mark();
  };
  const pickWords = () => {
    if (!state.lineStamped) { setLockedShown(true); return; }
    setLockedShown(false);
    dispatch({ type: 'setMode', mode: 'words' });
  };

  return (
    <div
      ref={ref}
      role="group"
      aria-label={t('guide.demo.wordsLabel')}
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

      <div role="tablist" aria-label={t('editor.modeGroup')} className="inline-flex self-start gap-0.5 rounded-lg bg-zinc-950 p-1">
        <button
          type="button"
          role="tab"
          aria-selected={!wordsMode}
          onClick={() => { setLockedShown(false); dispatch({ type: 'setMode', mode: 'lines' }); }}
          className={`${TAB} ${!wordsMode ? TAB_ON : ''}`}
        >
          {t('editor.tabLines')}
        </button>
        {/* aria-disabled, not disabled: like the real control, the locked option stays clickable to explain itself. */}
        <button
          type="button"
          role="tab"
          aria-selected={wordsMode}
          aria-disabled={!state.lineStamped || undefined}
          onClick={pickWords}
          className={`${TAB} ${wordsMode ? TAB_ON : ''} ${!state.lineStamped ? 'cursor-not-allowed opacity-40' : ''}`}
        >
          {t('editor.modeWords')}
        </button>
      </div>
      {/* Always mounted so screen readers announce the text when it appears. */}
      <div role="status" className={lockedShown && !state.lineStamped ? 'rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300' : undefined}>
        {lockedShown && !state.lineStamped ? t('editor.modeWordsLocked') : null}
      </div>

      {wordsMode ? (
        <ol aria-label={t('guide.demo.wordsList')} className="flex flex-wrap gap-2 rounded-lg bg-zinc-800/50 p-3">
          {words.map((word, i) => {
            const stamp = state.wordStamps[i];
            // Karaoke fill: a stamped word lights up once the playhead reaches its time.
            const filled = stamp !== null && time >= stamp;
            return (
              <li
                key={i}
                data-word-stamped={stamp !== null}
                aria-current={i === state.activeWord ? 'step' : undefined}
                className={`min-h-11 px-3 py-1 rounded-lg border flex flex-col items-center justify-center ${reducedMotion ? '' : 'transition-colors'} ${
                  filled ? 'bg-primary/25 border-primary/50 text-primary' : i === state.activeWord ? 'border-dashed border-zinc-600 text-zinc-100' : 'border-zinc-700 text-zinc-300'
                }`}
              >
                <span className="text-sm font-semibold">{word}</span>
                <span className="font-mono text-[11px] tabular-nums text-subtle">{stamp !== null ? formatTimestamp(stamp) : '--:--.--'}</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <ol className="flex flex-col gap-2">
          {LINES.map((line, i) => {
            const stamped = state.lineStamped && i === STAMPED_INDEX;
            return (
              <li
                key={line.key}
                data-stamped={stamped}
                className={`flex items-center gap-3 min-h-11 px-3 rounded-lg ${i === STAMPED_INDEX ? 'bg-zinc-800 border border-dashed border-zinc-700' : 'bg-zinc-800/50'}`}
              >
                <span className={`shrink-0 rounded-pill border px-2.5 py-0.5 font-mono text-xs tabular-nums ${stamped ? 'bg-primary/25 border-primary/50 text-primary' : 'border-zinc-700 text-subtle'}`}>
                  {state.lineTime !== null && stamped ? formatTimestamp(state.lineTime) : '--:--.--'}
                </span>
                <span className="min-w-0 truncate text-sm text-zinc-300">{t(line.key as never)}</span>
              </li>
            );
          })}
        </ol>
      )}

      <button
        type="button"
        onClick={mark}
        className="h-14 rounded-pill bg-primary text-zinc-950 text-[17px] font-bold select-none touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {t('guide.demo.mark')}
      </button>
      <p className="text-xs text-subtle">{t(wordsMode ? 'guide.demo.wordsHintWords' : 'guide.demo.wordsHintLines')}</p>
    </div>
  );
}
