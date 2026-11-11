import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { formatTimestamp } from '@/shared/utils/lrc';
import { useDemoClock } from './useDemoClock';
import { SAMPLE_DURATION, SAMPLE_LINES } from './sample-lines';

const LINE = SAMPLE_LINES[1];
// Lyrics, not UI text: the same in every language.
const FREQUENTS = ['yeah', 'ayy', 'woo'];
const BTN = 'h-11 min-w-11 px-4 inline-flex items-center justify-center gap-2 rounded-pill border border-zinc-700 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const pct = (time: number) => `${(time / SAMPLE_DURATION) * 100}%`;

type Pill = { time: number; text: string };

// A synced line with its word times; "Counterpart here" during playback drops a pill in its own lane.
export default function CounterpartsDemo() {
  const { t } = useTranslation();
  const { time, playing, play, pause, reset: resetClock, ref } = useDemoClock({ duration: SAMPLE_DURATION });
  const [pills, setPills] = useState<Pill[]>([]);
  const [draft, setDraft] = useState('');
  const words = String(t(LINE.key as never)).split(' ');
  const step = (LINE.end - LINE.time) / words.length;
  const naming = pills.length > 0 && pills[pills.length - 1].text === '' ? pills.length - 1 : null;

  const capture = () => { setPills((prev) => [...prev, { time, text: '' }]); setDraft(''); };
  const name = (text: string) => {
    const clean = text.trim();
    if (naming === null || !clean) return;
    setPills((prev) => prev.map((p, i) => (i === naming ? { ...p, text: clean } : p)));
  };
  const reset = () => { resetClock(); setPills([]); setDraft(''); };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || (e.key !== ' ' && e.key !== 'Enter')) return;
    e.preventDefault();
    capture();
  };
  const onSubmit = (e: FormEvent) => { e.preventDefault(); name(draft); };

  return (
    <div
      ref={ref}
      role="group"
      aria-label={t('guide.demo.counterpartsLabel')}
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
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">{t('editor.counterpart.lyricsLane')}</span>
        <div className="relative h-11 rounded-md bg-zinc-950">
          {words.map((word, i) => (
            <span
              key={i}
              className="absolute inset-y-1 flex items-center justify-center overflow-hidden rounded bg-primary/25 border border-primary/50 px-1 text-[11px] text-primary"
              style={{ left: pct(LINE.time + i * step), width: `calc(${(step / SAMPLE_DURATION) * 100}% - 2px)` }}
            >
              <span className="truncate">{word}</span>
            </span>
          ))}
          <span aria-hidden className="absolute inset-y-0 w-0.5 bg-zinc-100" style={{ left: pct(time) }} />
        </div>
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">{t('editor.counterpart.lane')}</span>
        <div className="relative h-11 rounded-md bg-zinc-950">
          {pills.map((pill, i) => (
            <span
              key={i}
              data-counterpart={pill.text === '' ? 'pending' : 'named'}
              className="absolute top-1 h-9 max-w-[40%] -translate-x-1/2 inline-flex items-center rounded-pill bg-counterpart-soft px-3 text-xs font-semibold text-counterpart-ink"
              style={{ left: pct(pill.time) }}
            >
              <span className="truncate">{pill.text === '' ? '…' : pill.text}</span>
            </span>
          ))}
        </div>
      </div>

      {naming !== null && (
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <input
            autoFocus
            type="text"
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={t('editor.counterpart.nameLabel')}
            placeholder={t('editor.counterpart.namePlaceholder')}
            className="h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
          <div className="flex flex-wrap gap-2">
            {FREQUENTS.map((word) => (
              <button key={word} type="button" onClick={() => name(word)} className={`${BTN} px-3`}>{word}</button>
            ))}
            <button type="submit" className={`${BTN} ml-auto`}>{t('guide.demo.counterpartSave')}</button>
          </div>
        </form>
      )}

      <button
        type="button"
        onClick={capture}
        className="h-14 rounded-pill bg-counterpart-soft text-counterpart-ink text-[17px] font-bold select-none touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {t('editor.counterpart.capture')}
      </button>
      <p className="text-xs text-subtle">{t('guide.demo.counterpartsHint')}</p>
    </div>
  );
}
