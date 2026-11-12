import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { formatTimestamp } from '@/shared/utils/lrc';
import { useDemoClock } from './useDemoClock';
import { SAMPLE_DURATION, SAMPLE_LINES } from './sample-lines';

const LINE = SAMPLE_LINES[1];
const NUDGE = 0.1;
const BTN = 'h-11 min-w-11 px-3 inline-flex items-center justify-center gap-2 rounded-pill border border-zinc-700 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const pct = (s: number) => `${(s / SAMPLE_DURATION) * 100}%`;

// Sandbox of the timing tools: nudge moves one stamped line, the A-B loop wraps the fake playhead.
export default function PlayerDemo() {
  const { t } = useTranslation();
  const { time, playing, play, pause, seek, ref } = useDemoClock({ duration: SAMPLE_DURATION });
  const [stamp, setStamp] = useState(LINE.time);
  const [loop, setLoop] = useState(false);

  // The loop region is the line itself: its stamp to its end, as the editor's repeat button does.
  useEffect(() => {
    if (loop && playing && time >= LINE.end) seek(stamp);
  }, [loop, playing, time, stamp, seek]);

  const nudge = (delta: number) => setStamp((s) => Math.min(LINE.end - NUDGE, Math.max(0, Math.round((s + delta) * 10) / 10)));

  return (
    <div ref={ref} role="group" aria-label={t('guide.demo.playerLabel')} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3 min-h-11 px-3 rounded-lg bg-zinc-800">
        <span className="shrink-0 rounded-pill border bg-primary/25 border-primary/50 text-primary px-2.5 py-0.5 font-mono text-xs tabular-nums" aria-live="polite">
          {formatTimestamp(stamp)}
        </span>
        <span className="min-w-0 truncate text-sm font-semibold text-zinc-100">{t(LINE.key as never)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => nudge(-NUDGE)} className={BTN} aria-label={t('guide.demo.nudgeEarlier', { amount: NUDGE })}>
          <Icon name="remove" size={16} />{NUDGE}s
        </button>
        <button type="button" onClick={() => nudge(NUDGE)} className={BTN} aria-label={t('guide.demo.nudgeLater', { amount: NUDGE })}>
          <Icon name="add" size={16} />{NUDGE}s
        </button>
        <button type="button" aria-pressed={loop} onClick={() => setLoop((l) => !l)} className={`${BTN} ${loop ? 'bg-primary/20 border-primary/50 text-primary' : ''}`}>
          <Icon name="repeat" size={16} />{t('guide.demo.loop')}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={playing ? pause : play} className={BTN}>
          <Icon name={playing ? 'pause' : 'play_arrow'} size={16} />{t(playing ? 'guide.demo.pause' : 'guide.demo.play')}
        </button>
        <span className="font-mono text-sm tabular-nums text-zinc-300">{formatTimestamp(time)}</span>
      </div>
      <div aria-hidden="true" className="relative h-3 rounded-pill bg-zinc-800 overflow-hidden">
        {loop && <span className="absolute inset-y-0 bg-primary/30" style={{ left: pct(stamp), width: pct(LINE.end - stamp) }} />}
        <span className="absolute inset-y-0 w-0.5 bg-primary" style={{ left: pct(time) }} />
      </div>
      <p className="text-xs text-subtle">{t('guide.demo.playerHint')}</p>
    </div>
  );
}
