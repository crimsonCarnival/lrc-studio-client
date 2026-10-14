import { EmptyState } from '@ui/EmptyState';
import { Kbd } from '@ui/kbd';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { formatTime } from '@/shared/utils/format-time';
import type { EditorLine } from '@/features/editor/services/editor.service';

const CAPTION = 'text-xs font-bold uppercase tracking-[0.08em] text-foreground/65';
/** Smallest gap kept between two neighbouring word starts while dragging. */
const MIN_WORD_GAP = 0.02;
/** A timed word shorter than this (seconds) is flagged: nobody sings a word in under 80 ms. */
const TOO_SHORT = 0.08;

interface WordsLineNavProps {
  lines: EditorLine[];
  activeLineIndex: number;
  onSelect: (lineIndex: number) => void;
}

/** Left column of words mode: every lyric line with how many of its words are timed. */
export const WordsLineNav = memo(function WordsLineNav({ lines, activeLineIndex, onSelect }: WordsLineNavProps) {
  const { t } = useTranslation();
  const activeRef = useRef<HTMLButtonElement>(null);

  const items = useMemo(() => {
    const out: { index: number; text: string; timed: number; total: number }[] = [];
    lines.forEach((line, index) => {
      if (line.type === 'section' || !line.text?.trim()) return;
      const total = line.words?.length || line.text.trim().split(/\s+/).length;
      const timed = line.words?.filter((w) => w.time != null).length ?? 0;
      out.push({ index, text: line.text, timed, total });
    });
    return out;
  }, [lines]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeLineIndex]);

  return (
    <nav
      aria-label={t('editor.words.navTitle')}
      className="lrc-scroll max-lg:hidden w-[300px] xl:w-[320px] shrink-0 min-h-0 overflow-y-auto flex flex-col gap-1 p-4 border-r border-zinc-800 bg-zinc-950/40"
    >
      <span className={`${CAPTION} px-2 pb-2`}>{t('editor.words.navTitle')}</span>
      {items.map((item) => {
        const active = item.index === activeLineIndex;
        return (
          <button
            key={item.index}
            ref={active ? activeRef : undefined}
            type="button"
            aria-current={active ? 'true' : undefined}
            onClick={() => onSelect(item.index)}
            className={`flex flex-col gap-1.5 px-2.5 py-2.5 rounded-[10px] text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${active
              ? 'bg-zinc-800 text-foreground font-semibold ring-1 ring-inset ring-primary/40'
              : 'text-foreground/80 hover:bg-zinc-800/50'}`}
          >
            <span className="flex justify-between gap-2">
              <span className="truncate">{item.text}</span>
              <span className="flex-none font-mono text-[11px] font-normal tabular-nums text-foreground/65">{item.timed}/{item.total}</span>
            </span>
            <span className="h-1 rounded-full bg-zinc-700/60 overflow-hidden">
              <span
                className={`block h-full ${item.timed === item.total ? 'bg-success' : 'bg-primary'}`}
                style={{ width: `${item.total ? (item.timed / item.total) * 100 : 0}%` }}
              />
            </span>
          </button>
        );
      })}
    </nav>
  );
});

interface WordTimelineProps {
  line: EditorLine;
  /** Where the line stops: its end time, the next timed line, or the track's end. */
  lineEnd: number | null;
  playbackPosition: number;
  /** Index of the word the next mark will stamp, or -1. */
  activeWordIndex: number;
  onSetWordTime: (wordIndex: number, time: number) => void;
}

/**
 * The focused line laid out in time: one block per word, as wide as the word
 * lasts. Dragging a block's left edge moves where that word starts, within the
 * line and its neighbours. Words with no time yet share what is left of the line evenly and
 * cannot be dragged.
 */
export function WordTimeline({ line, lineEnd, playbackPosition, activeWordIndex, onSetWordTime }: WordTimelineProps) {
  const { t } = useTranslation();
  const trackRef = useRef<HTMLDivElement>(null);
  // Which edge is being dragged. The time itself is written to the line on every
  // move, so the word chips above follow the drag; the undo history groups
  // changes that arrive in quick succession, so a drag is still one step back.
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const start = line.timestamp;
  const words = useMemo(() => line.words ?? [], [line.words]);
  const span = start != null && lineEnd != null && lineEnd > start ? lineEnd - start : null;

  const segments = useMemo(() => {
    if (start == null || span == null) return [];
    const end = start + span;
    // Clamped for drawing: a word whose saved time lies outside the line (older
    // data, or a line start moved after its words were stamped) sits at the edge
    // instead of spilling out of the track.
    const times = words.map((w) => (w.time == null ? null : Math.min(end, Math.max(start, w.time))));
    let lastTimed = -1;
    times.forEach((time, i) => { if (time != null) lastTimed = i; });
    const untimedCount = words.length - 1 - lastTimed;
    // The last timed word runs up to where the untimed ones begin sharing the rest.
    const tailStart = lastTimed >= 0 ? (times[lastTimed] as number) : start;
    const tailShare = (end - tailStart) / (untimedCount + (lastTimed >= 0 ? 1 : 0) || 1);
    return words.map((w, i) => {
      const time = times[i];
      let from: number;
      let to: number;
      if (i <= lastTimed) {
        // An untimed word between timed ones has no width of its own.
        from = time ?? (times.slice(0, i).reverse().find((x) => x != null) ?? start);
        const nextTimed = times.slice(i + 1, lastTimed + 1).find((x) => x != null);
        to = time == null ? from : nextTimed ?? tailStart + tailShare;
      } else {
        const k = i - lastTimed - (lastTimed >= 0 ? 0 : 1);
        from = tailStart + tailShare * k;
        to = from + tailShare;
      }
      return { word: w.word, timed: time != null, from: Math.max(start, from), to: Math.max(from, Math.min(to, end)) };
    });
  }, [words, start, span]);

  if (start == null || span == null || words.length === 0) {
    return (
      <EmptyState
        art="words"
        words={words.map((w) => w.word ?? '').filter(Boolean)}
        title={t('editor.words.emptyTitle')}
        description={<Trans i18nKey="editor.words.emptyDesc" components={[<Kbd key="0" />]} />}
      />
    );
  }

  const timeAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return start;
    return start + Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * span;
  };
  // A word stays after the timed word before it and before the one after it;
  // the first and last are held by the line's own start and end instead.
  const clampFor = (index: number, time: number) => {
    const before = words.slice(0, index).reverse().find((w) => w.time != null)?.time;
    const after = words.slice(index + 1).find((w) => w.time != null)?.time;
    const min = before != null ? Math.max(start, before + MIN_WORD_GAP) : start;
    // Always short of the line's end, so the last word keeps some length.
    const max = Math.min(start + span, after ?? Infinity) - MIN_WORD_GAP;
    return Math.max(min, Math.min(Math.max(min, max), time));
  };

  const handlePointerDown = (index: number) => (e: PointerEvent<HTMLSpanElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragIndex(index);
  };
  const handlePointerMove = (index: number) => (e: PointerEvent<HTMLSpanElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const time = Number(clampFor(index, timeAt(e.clientX)).toFixed(3));
    if (time !== words[index].time) onSetWordTime(index, time);
  };
  const handlePointerUp = () => setDragIndex(null);
  const nudge = (index: number, delta: number) => {
    const time = words[index].time;
    if (time != null) onSetWordTime(index, Number(clampFor(index, time + delta).toFixed(3)));
  };

  const playhead = (playbackPosition - start) / span;

  return (
    <section aria-label={t('editor.words.timelineLabel')} className="rounded-[var(--radius-card)] bg-background inset-ring inset-ring-hl px-5 pt-5 pb-4 flex flex-col gap-3.5">
      <div ref={trackRef} className="relative h-10 touch-none select-none">
        {/* Blocks are clipped to the track: a word squeezed against either end
            narrows instead of spilling out. Edges and the playhead sit outside
            this layer because they are meant to overhang. */}
        <div className="absolute inset-0 overflow-hidden rounded-lg">
        {segments.map((seg, i) => {
          const isNow = i === activeWordIndex;
          // A timed word this short is almost certainly a mis-stamp or an overlap with its
          // neighbour, so it is called out in gold (redesign sheet 14).
          const tooShort = seg.timed && seg.to - seg.from < TOO_SHORT;
          return (
            <span
              key={i}
              title={tooShort ? t('editor.words.tooShort', { word: seg.word, seconds: (seg.to - seg.from).toFixed(2) }) : undefined}
              // @container: the label hides itself once the block is narrower than 36px.
              className={`@container absolute inset-y-0 flex items-center rounded-lg text-sm font-semibold overflow-hidden whitespace-nowrap ${isNow
                ? 'bg-primary text-primary-foreground'
                : tooShort
                  ? 'bg-gold-soft text-gold-ink inset-ring-[1.5px] inset-ring-gold'
                  : seg.timed ? 'bg-raised text-foreground inset-ring inset-ring-hl' : 'bg-card text-faint inset-ring inset-ring-hl'}`}
              style={{
                left: `calc(${((seg.from - start) / span) * 100}% + 2px)`,
                width: `max(0px, calc(${((seg.to - seg.from) / span) * 100}% - 4px))`,
              }}
            >
              {/* Left grip: the edge you drag to move where the word starts. */}
              {seg.timed && !tooShort && (
                <span aria-hidden className={`absolute left-0 inset-y-1.5 w-[3px] rounded-sm ${isNow ? 'bg-primary-foreground/50' : 'bg-faint'}`} />
              )}
              <span className="hidden pl-2.5 @[36px]:inline">{seg.word}</span>
            </span>
          );
        })}
        </div>
        {/* Edges: one per timed word, at the word's own start. The first word's
            is the left side of its block; every other one is also the right
            side of the block before it. */}
        {segments.map((seg, i) => (seg.timed ? (
          <span
            key={`edge-${i}`}
            role="slider"
            tabIndex={0}
            aria-label={t('editor.words.boundaryLabel', { word: seg.word })}
            aria-valuemin={Number(start.toFixed(2))}
            aria-valuemax={Number((start + span).toFixed(2))}
            aria-valuenow={Number(seg.from.toFixed(2))}
            onPointerDown={handlePointerDown(i)}
            onPointerMove={handlePointerMove(i)}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); nudge(i, -0.05); }
              else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); nudge(i, 0.05); }
            }}
            className="group absolute inset-y-0 w-3 coarse:w-11 -translate-x-1/2 grid place-items-center cursor-ew-resize touch-none focus-visible:outline-none"
            style={{ left: `${((seg.from - start) / span) * 100}%` }}
          >
            <span className={`w-0.5 h-full rounded-full transition-colors group-hover:bg-foreground group-focus-visible:bg-foreground ${dragIndex === i ? 'bg-foreground' : 'bg-transparent'}`} />
            {dragIndex === i && (
              <span className="absolute bottom-full mb-1.5 rounded-md bg-foam px-[7px] py-[3px] font-mono text-[11px] leading-none font-semibold tabular-nums text-background whitespace-nowrap pointer-events-none">
                {formatTime(seg.from)}
              </span>
            )}
          </span>
        ) : null))}
        {playhead >= 0 && playhead <= 1 && (
          <span aria-hidden className="absolute inset-y-[-4px] w-0.5 rounded-full bg-foam pointer-events-none" style={{ left: `${playhead * 100}%` }} />
        )}
      </div>
      <span className="text-[13px] text-subtle">{t('editor.words.dragHint')}</span>
    </section>
  );
}
