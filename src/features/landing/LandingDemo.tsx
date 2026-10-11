import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Icon } from '@/shared/ui/Icon';

/**
 * The hero's looping editor + preview mock. It owns the playback clock so the
 * 20 fps tick re-renders only this subtree, never the rest of the landing page.
 *
 * Everything except the play/pause button is decorative and hidden from
 * assistive tech; that one control is real because content that moves for
 * more than a few seconds needs a way to stop it.
 */

const DURATION = 16;
const TICK_MS = 50;
// Where the clock rests when motion is reduced: mid-way through line 2, so the
// still frame shows a past line, an active line and upcoming ones.
const STILL_FRAME = 4.4;

// Sample lyric, not UI copy. `cjk` lines have no spaces between words.
const DEMO_LINES: { t: number; w: string[]; cjk?: boolean }[] = [
  { t: 0.4, w: ['The', 'stars', 'align', 'above', 'the', 'city', 'lights'] },
  { t: 3.6, w: ['Midnight', 'echoes', 'through', 'the', 'empty', 'halls'] },
  { t: 6.8, w: ['She', 'sang', 'a', 'melody', 'that', 'broke', 'the', 'night'] },
  { t: 10.0, w: ['And', 'disappeared', 'before', 'the', 'morning', 'calls'] },
  { t: 13.2, w: ['月明かりに', '照らされた', '道を'], cjk: true },
];

const WORD_COUNT = DEMO_LINES.reduce((n, l) => n + l.w.length, 0);
const TIMELINE_TICKS = [0, 4, 8, 12, 16];

function formatStamp(seconds: number): string {
  // Work in whole centiseconds: flooring float seconds turns 6.8 into "06.79".
  const total = Math.round(seconds * 100);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 6000))}:${pad(Math.floor(total / 100) % 60)}.${pad(total % 100)}`;
}

const PANEL = 'min-w-0 rounded-[22px] bg-zinc-900 flex flex-col font-lyrics';
const PANEL_LABEL = 'inline-flex items-center gap-2 text-[15px] font-bold tracking-[0.08em] uppercase text-zinc-100';

export default function LandingDemo({ reducedMotion }: { reducedMotion: boolean }) {
  const { t } = useTranslation();
  const [time, setTime] = useState(reducedMotion ? STILL_FRAME : 0);
  const [playing, setPlaying] = useState(!reducedMotion);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setTime((prev) => (prev + TICK_MS / 1000 >= DURATION ? 0 : prev + TICK_MS / 1000));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [playing]);

  let active = 0;
  DEMO_LINES.forEach((line, i) => { if (time >= line.t) active = i; });
  const progress = `${((time / DURATION) * 100).toFixed(2)}%`;

  return (
    <div className="flex flex-wrap gap-5">
      {/* ── Editor panel ── */}
      <div className={`${PANEL} flex-[999_1_620px] gap-3.5 px-5 pt-5 pb-[18px]`}>
        <div aria-hidden="true" className="flex items-center gap-4 px-1.5 py-1 text-foreground/80">
          <span className={PANEL_LABEL}><Icon name="description" size={16} />{t('landing.demo.editor')}</span>
          {/* Responsive hiding lives on wrappers: the icon font's own unlayered
              `display` rule outranks Tailwind's `hidden` on the Icon itself. */}
          <span className="hidden sm:flex items-center gap-4">
            <Icon name="edit" size={16} />
            <Icon name="save" size={16} />
            <span className="w-px h-[18px] bg-zinc-700" />
            <Icon name="undo" size={16} />
            <Icon name="redo" size={16} className="text-foreground/35" />
          </span>
          <span className="ml-auto inline-flex items-center gap-2 h-[30px] px-3 rounded-full border border-zinc-700 font-mono text-xs font-medium">
            <span className="size-1.5 rounded-full bg-primary" />
            {t('landing.demo.progress', { done: DEMO_LINES.length, total: DEMO_LINES.length, words: WORD_COUNT })}
          </span>
          <span className="hidden md:flex items-center gap-4">
            <Icon name="visibility_off" size={18} />
            <Icon name="language" size={18} />
            <Icon name="search" size={18} />
          </span>
          <Icon name="more_horiz" size={18} />
        </div>

        <div aria-hidden="true" className="relative rounded-xl bg-zinc-800/70 p-3.5 text-center text-[15px] text-zinc-100 overflow-hidden">
          {t('landing.demo.selectHint')}
          <span className="absolute left-0 bottom-0 h-0.5 bg-primary" style={{ width: progress }} />
        </div>

        <ol aria-hidden="true" className="flex flex-col gap-2">
          {DEMO_LINES.map((line, i) => {
            const isActive = i === active;
            const end = i + 1 < DEMO_LINES.length ? DEMO_LINES[i + 1].t : DURATION;
            const lineProgress = Math.min(1, Math.max(0, (time - line.t) / (end - line.t)));
            return (
              <li
                key={line.t}
                className={`relative flex items-center gap-3.5 min-h-14 py-2 pl-5 pr-4 rounded-[14px] border transition-colors ${
                  isActive ? 'bg-zinc-800 border-dashed border-zinc-700' : 'bg-zinc-800/50 border-transparent'
                }`}
              >
                <span className={`absolute left-1.5 top-2.5 bottom-2.5 w-[3px] rounded-sm ${isActive ? 'bg-primary/80' : 'bg-transparent'}`} />
                <Icon name="drag_indicator" size={16} className="shrink-0 text-foreground/45" />
                <span className="shrink-0 w-[22px] font-mono text-xs font-semibold text-foreground/80">{i + 1}</span>
                <span
                  className={`shrink-0 inline-flex items-center h-6 px-2.5 rounded-full border font-mono text-xs font-medium tabular-nums transition-colors ${
                    isActive ? 'bg-primary/25 border-primary/50 text-primary' : 'bg-primary/10 border-primary/20 text-foreground/65'
                  }`}
                >
                  {formatStamp(line.t)}
                </span>
                <span className={`min-w-0 text-[15px] text-zinc-100 ${line.cjk ? '' : '[word-spacing:4px]'} ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {line.w.join(line.cjk ? '' : ' ')}
                </span>
                {isActive && (
                  <>
                    <span className="ml-auto shrink-0 hidden lg:inline-flex items-center gap-2">
                      <span className="size-9 rounded-[10px] bg-primary/30 text-primary inline-flex items-center justify-center">
                        <Icon name="location_on" size={16} />
                      </span>
                      <span className="inline-flex items-center gap-3 h-10 px-3.5 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-100">
                        <Icon name="play_arrow" size={14} />
                        <Icon name="chevron_left" size={14} />
                        <Icon name="chevron_right" size={14} />
                        <span className="w-px h-[18px] bg-zinc-700" />
                        <Icon name="add" size={14} className="text-foreground/45" />
                        <Icon name="edit" size={14} className="text-accent-blue" />
                        <Icon name="layers" size={14} />
                        <Icon name="more_horiz" size={14} />
                      </span>
                    </span>
                    <span
                      className="absolute left-0 -bottom-px h-[3px] rounded-sm bg-primary"
                      style={{ width: `${(lineProgress * 100).toFixed(2)}%` }}
                    />
                  </>
                )}
              </li>
            );
          })}
        </ol>

        <div aria-hidden="true" className="flex justify-center mt-1">
          <ModePill t={t} />
        </div>

        <div aria-hidden="true" className="px-2.5 flex flex-col gap-2">
          <div className="relative h-[38px] rounded-full bg-zinc-950 overflow-hidden">
            <span className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent to-primary/35" style={{ width: progress }} />
            <span className="absolute inset-y-0 w-0.5 bg-primary/80" style={{ left: progress }} />
          </div>
          <div className="flex justify-between font-mono text-[11px] font-semibold text-foreground/80">
            {TIMELINE_TICKS.map((s) => <span key={s}>{formatStamp(s)}</span>)}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3.5 flex-wrap text-zinc-100">
          <span aria-hidden="true" className="font-mono text-sm font-medium min-w-[76px] tabular-nums">{formatStamp(time)}</span>
          <span aria-hidden="true" className="hidden sm:inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-primary text-primary-foreground font-mono text-sm font-semibold">
            1x<Icon name="expand_more" size={14} />
          </span>
          <span aria-hidden="true" className="inline-flex"><Icon name="skip_previous" size={18} /></span>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? t('landing.demo.pause') : t('landing.demo.play')}
            className="size-10 rounded-full bg-primary hover:bg-primary-dim text-primary-foreground inline-flex items-center justify-center transition-colors"
          >
            <Icon name={playing ? 'pause' : 'play_arrow'} size={18} />
          </button>
          <span aria-hidden="true" className="inline-flex"><Icon name="skip_next" size={18} /></span>
          <span aria-hidden="true" className="hidden sm:inline-flex items-center gap-2.5">
            <span className="size-9 rounded-full bg-zinc-800 inline-flex items-center justify-center"><Icon name="volume_up" size={16} /></span>
            <span className="relative w-[110px] h-1 rounded-sm bg-zinc-700">
              <span className="absolute inset-y-0 left-0 w-[18%] rounded-sm bg-primary" />
              <span className="absolute left-[18%] top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
            </span>
          </span>
          <span aria-hidden="true" className="font-mono text-sm font-medium tabular-nums">{formatStamp(DURATION)}</span>
        </div>
        <p className="text-center text-sm text-zinc-100">{t('landing.demo.stampHint')}</p>
      </div>

      {/* ── Preview panel ── */}
      <div aria-hidden="true" className={`${PANEL} flex-[1_1_340px] gap-[18px] px-[26px] pt-5 pb-[26px]`}>
        <div className="flex items-center gap-3.5 text-foreground/80">
          <span className={`${PANEL_LABEL} text-sm`}><Icon name="visibility" size={16} />{t('landing.demo.preview')}</span>
          <span className="ml-auto inline-flex items-center gap-3.5">
            <Icon name="share" size={16} />
            <Icon name="download" size={16} />
          </span>
        </div>
        <span className="block h-0.5 rounded-sm bg-gradient-to-r from-primary to-success" style={{ width: progress }} />
        <div className="flex flex-col gap-[18px]">
          {DEMO_LINES.map((line, i) => {
            const isActive = i === active;
            const end = i + 1 < DEMO_LINES.length ? DEMO_LINES[i + 1].t : DURATION;
            // Words fill across the first 80% of the line, leaving a beat before the next one.
            const wordStep = ((end - line.t) * 0.8) / line.w.length;
            return (
              <p
                key={line.t}
                className={`leading-tight transition-[font-size,color] duration-300 ${
                  isActive
                    ? 'text-[32px] font-extrabold text-zinc-100'
                    : `text-[22px] font-medium ${i < active ? 'text-primary/80' : 'text-zinc-100'}`
                }`}
              >
                {line.w.map((word, k) => {
                  const lit = isActive && time >= line.t + k * wordStep;
                  return (
                    <span key={k} className={`whitespace-pre-wrap transition-colors duration-150 ${lit ? 'text-primary glow-line' : ''}`}>
                      {word}{line.cjk || k === line.w.length - 1 ? '' : ' '}
                    </span>
                  );
                })}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** The Auto-stamp + mode pill from the editor toolbar; also reused by the step-4 mock. */
export function ModePill({ t }: { t: TFunction }) {
  return (
    <div className="inline-flex items-center gap-1.5 p-1.5 rounded-full bg-zinc-800/70 border border-zinc-700 flex-wrap justify-center">
      <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-success text-success-foreground text-sm font-semibold">
        <Icon name="auto_fix_high" size={15} />{t('landing.demo.autoStamp')}
      </span>
      <span className="inline-flex gap-0.5 px-1.5 text-sm font-bold text-zinc-100">
        <span className="px-2.5 py-2">LRC</span>
        <span className="px-2.5 py-2">SRT</span>
        <span className="px-2.5 py-2">{t('landing.demo.modeWords')}</span>
      </span>
    </div>
  );
}
