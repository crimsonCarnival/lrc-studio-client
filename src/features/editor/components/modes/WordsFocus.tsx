import { EmptyState } from '@ui/EmptyState';
import { Kbd } from '@ui/kbd';
import { Fragment, memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent, ReactNode, WheelEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { formatTime } from '@/shared/utils/format-time';
import { needsSpaceAfter, rubyFitStyle, rubyRatioClass, splitOkurigana, toHiragana, toKatakana } from '@/shared/utils/furigana';
import type { EditorLine, EditorWord } from '@/features/editor/editor.types';
import { useRemoteActiveLines } from '@/features/collab/collab-presence-context';
import { collabColor } from '@/features/collab/collab-color';
import { useSettings } from '@/features/settings/useSettings';
import { getCachedPeaks, PEAKS_EVENT } from '@/features/player/waveform-peaks';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@ui/context-menu';
import { Tip } from '@ui/tip';
import { Icon } from '@/shared/ui/Icon';
import { MIN_WORD_GAP, TOO_SHORT, layoutWords, snapTime, splitMorae, wordEndAt, wordKana } from '@/features/editor/utils/word-timing';
import type { SnapMode } from '@/features/editor/utils/word-timing';
import { lineOverlap } from '@/features/editor/utils/line-span';
import type { LineBand } from '@/features/editor/utils/line-span';
import type { LineTimingEdit } from '@/features/editor/utils/line-timing';

const CAPTION = 'text-xs font-bold uppercase tracking-[0.08em] text-foreground/65';
/** Spacing of the ruler ticks (seconds). */
const RULER_TICK = 0.1;
/** How much one press of a zoom button narrows or widens the view. */
const ZOOM_STEP = 1.5;
/** The narrowest and the widest stretch of the song the axis shows (seconds). */
const MIN_SPAN = 1;
const MAX_SPAN = 60;
/** A line longer than this (the last one runs to the end of the track, one before a solo runs
 *  through it) is not fitted whole: the view stops a little after its last word instead. */
const LONG_LINE = 20;
/** How long the axis takes to slide to another line (ms). */
const GLIDE_MS = 180;
/** How close (px) a dragged edge has to come to something before it snaps there. */
const SNAP_PX = 8;
/** Bars drawn for the waveform behind the rows. */
const WAVE_BINS = 240;

/**
 * Opens the context menu whose trigger is `target`, anchored under `anchor`: the ⋮ buttons
 * give the right-click menus a way in from a click or the keyboard.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function openContextMenuAt(target: HTMLElement | null, anchor: HTMLElement) {
  if (!target) return;
  const r = anchor.getBoundingClientRect();
  target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left, clientY: r.bottom }));
}

/** A word with its reading over the kanji only (the okurigana stays outside the ruby). */
export function WordRuby({ word, reading, format }: { word: string; reading?: string | null; format?: string }) {
  if (!reading) return <>{word}</>;
  const { lead, kanji, tail } = splitOkurigana(word);
  if (!kanji) return <>{word}</>;
  const shown = format === 'katakana' ? toKatakana(reading) : toHiragana(reading);
  return (
    <>
      {lead}
      <ruby className={rubyRatioClass(kanji, reading)} style={rubyFitStyle(kanji, reading)}>
        {kanji}
        <rt>{shown}</rt>
      </ruby>
      {tail}
    </>
  );
}

/** A line's words with their readings, spaced the way the line is written. */
function RubyLine({ words, format }: { words: EditorWord[]; format?: string }) {
  return (
    <>
      {words.map((w, k) => (
        <Fragment key={k}>
          <WordRuby word={w.word ?? ''} reading={w.reading} format={format} />
          {needsSpaceAfter(w.word, words[k + 1]?.word) ? ' ' : ''}
        </Fragment>
      ))}
    </>
  );
}

/** Timed words that last less than TOO_SHORT, by their own end or the next word's start. */
function countTooShort(words: EditorWord[] | undefined): number {
  if (!words) return 0;
  let n = 0;
  words.forEach((w, i) => {
    if (w.time == null) return;
    const next = words.slice(i + 1).find((x) => x.time != null)?.time;
    const stop = w.end ?? next;
    if (stop != null && stop - w.time < TOO_SHORT) n++;
  });
  return n;
}

function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* kept for this visit only */ }
  }, [key, value]);
  return [value, setValue] as const;
}

interface WordsLineNavProps {
  lines: EditorLine[];
  activeLineIndex: number;
  onSelect: (lineIndex: number) => void;
}

/** Left column of words mode: every lyric line, with its furigana and how many of its words are timed. */
export const WordsLineNav = memo(function WordsLineNav({ lines, activeLineIndex, onSelect }: WordsLineNavProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const format = settings.editor?.display?.readingFormat;
  const activeRef = useRef<HTMLButtonElement>(null);
  // Lines other participants are on (null outside a session).
  const remoteActive = useRemoteActiveLines();

  const items = useMemo(() => {
    const out: { index: number; id?: string; text: string; words?: EditorWord[]; timed: number; total: number; tooShort: number; overlap: number | null }[] = [];
    lines.forEach((line, index) => {
      if (line.type === 'section' || !line.text?.trim()) return;
      const total = line.words?.length || line.text.trim().split(/\s+/).length;
      const timed = line.words?.filter((w) => w.time != null).length ?? 0;
      // Words are only drawn one by one when there is a reading to show; otherwise the text keeps its own spacing.
      const words = line.words?.some((w) => w.reading) ? line.words : undefined;
      out.push({ index, id: line.id, text: line.text, words, timed, total, tooShort: countTooShort(line.words), overlap: lineOverlap(lines, index)?.seconds ?? null });
    });
    return out;
  }, [lines]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeLineIndex]);

  return (
    <nav
      data-tour="words-nav"
      aria-label={t('editor.words.navTitle')}
      className="lrc-scroll max-lg:hidden w-[300px] xl:w-[320px] shrink-0 min-h-0 overflow-y-auto flex flex-col gap-1 p-4 border-r border-zinc-800 bg-zinc-950/40"
    >
      <span className={`${CAPTION} px-2 pb-2`}>{t('editor.words.navTitle')}</span>
      {items.map((item) => {
        const active = item.index === activeLineIndex;
        const remote = item.id != null ? remoteActive?.[item.id] : undefined;
        return (
          <button
            key={item.index}
            ref={active ? activeRef : undefined}
            type="button"
            aria-current={active ? 'true' : undefined}
            onClick={() => onSelect(item.index)}
            className={`flex flex-col gap-1.5 px-2.5 py-2 rounded-[calc(var(--radius)*1)] text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${active
              ? 'bg-zinc-800 text-foreground font-semibold ring-1 ring-inset ring-primary/40'
              : 'text-foreground/80 hover:bg-zinc-800/50'}`}
          >
            <span className="flex items-end justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                {remote && (
                  <Tip content={t('collab.presence.onLine', { name: remote.name })}>
                    <span
                      role="img"
                      aria-label={t('collab.presence.onLine', { name: remote.name })}
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: collabColor(remote.colorIndex) }}
                    />
                  </Tip>
                )}
                {/* The rt sits above the line box; the padding is the room it needs inside the clip. */}
                <span className={`truncate ${item.words ? 'pt-2.5 leading-[1.35]' : ''}`}>
                  {item.words ? <RubyLine words={item.words} format={format} /> : item.text}
                </span>
              </span>
              <span className="flex flex-none items-center gap-1.5 pb-px">
                {item.tooShort > 0 && (
                  <span role="img" aria-label={t('editor.words.warnings', { count: item.tooShort })} className="grid text-gold"><Icon name="warning" size={14} /></span>
                )}
                {item.overlap != null && (
                  <Tip content={t('editor.words.overlapsNext', { seconds: item.overlap.toFixed(2) })}>
                    <span
                      role="img"
                      aria-label={t('editor.words.overlapsNext', { seconds: item.overlap.toFixed(2) })}
                      className="rounded-pill bg-primary/15 px-1.5 py-px font-mono text-[10px] font-normal tabular-nums text-primary inset-ring inset-ring-primary/50"
                    >
                      +{item.overlap.toFixed(2)}
                    </span>
                  </Tip>
                )}
                <span className="font-mono text-[11px] font-normal tabular-nums text-foreground/65">{item.timed}/{item.total}</span>
              </span>
            </span>
            <span className="h-1 rounded-pill bg-zinc-700/60 overflow-hidden">
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

/** A neighbouring line drawn as one dimmed row beside the focused line's words. */
export interface GhostLine {
  /** Index of the line in the editor's list. */
  index: number;
  /** Its number among the lyric lines. */
  number: number;
  line: EditorLine;
  /** Where that line stops sounding. */
  end: number | null;
  /** The start of the line after it, when there is one: what its last word may run on past. */
  holdLimit?: number | null;
}

interface View {
  /** Song time at the left edge of the axis. */
  from: number;
  /** Seconds the axis shows. */
  span: number;
}

interface WordTimelineProps {
  line: EditorLine;
  /** Where the line stops sounding: its end time, the next timed line, the track's end, or
   *  later when its last word is held over the next line. */
  lineEnd: number | null;
  /** Where the line stops unless its last word is held longer. Defaults to `lineEnd`. */
  naturalEnd?: number | null;
  /** Length of the track: the axis scrolls over all of it. */
  duration?: number | null;
  /** Changes when another line takes the focus; the axis then moves to that line. */
  lineKey?: string | number;
  /** Index of the focused line in the editor's list (what `bands` call it). */
  lineIndex?: number;
  /** Every timed line, for the lane above the words and the map in the scrollbar. */
  bands?: LineBand[];
  /** The next timed line, drawn under the words. */
  nextLine?: GhostLine | null;
  /** The line before, when it still sounds over this one; drawn above the words. */
  prevLine?: GhostLine | null;
  /** Gives another line the focus. */
  onSelectLine?: (lineIndex: number) => void;
  /** Changes when a whole line sounds, from its chip in the lines lane: its start, its end, or all of it. */
  onChangeLineTiming?: (lineIndex: number, edit: LineTimingEdit) => void;
  /** Ends the previous line's last word at the playhead. */
  onEndPrevious?: () => void;
  playbackPosition: number;
  isPlaying: boolean;
  /** Index of the word the next mark will stamp, or -1. */
  activeWordIndex: number;
  /** The word picked by a click (its time is what the nudge keys move), or null. */
  selectedWordIndex: number | null;
  /** The word being sung while the line plays, or null. */
  playingWordIndex: number | null;
  onSetWordTime: (wordIndex: number, time: number) => void;
  /** Sets where a word stops; null joins it back up with the word after it. */
  onSetWordEnd: (wordIndex: number, end: number | null) => void;
  /** Moves where a word of a neighbouring line starts, dragged from that line's own row. */
  onSetNeighbourWordTime?: (lineIndex: number, wordIndex: number, time: number) => void;
  /** Sets where a word of a neighbouring line stops, dragged from that line's own row. */
  onSetNeighbourWordEnd?: (lineIndex: number, wordIndex: number, end: number | null) => void;
  /** The earliest the line's first word may start: once the line before it has started. */
  startFloor?: number;
  /** Picks a word: seeks to it and makes it the one the keys act on. */
  onSelectWord: (wordIndex: number) => void;
  onEditLine?: () => void;
  /** The mark shortcut as the user configured it, already turned into a key-cap label. */
  markKey: string;
  /** Plays from a word's own stamped time. */
  onPlayFrom?: (time: number) => void;
  /** The items of a word's context menu. */
  wordMenu: (wordIndex: number) => ReactNode;
  /** Controls drawn at the right of the footer (the loop button). */
  footerEnd?: ReactNode;
  /** Key hints drawn at the left of the footer. */
  hints?: ReactNode;
}

/** The view that shows a whole line, with a little before it and the head of what follows. */
function fitView(start: number, end: number): View {
  const length = Math.max(0.5, end - start);
  const before = Math.max(0.3, length * 0.08);
  const after = Math.max(0.8, length * 0.2);
  return { from: start - before, span: length + before + after };
}

/**
 * One dimmed row for a neighbouring line: its words where they sound. The start of each word
 * can be dragged from here, without giving that line the focus first; its first word carries
 * the line's own start, which is the other way to open or close an overlap.
 */
function GhostRow({ ghost, tone, caption, view, onSelect, action, floor, cap, timeAt, onSetWordTime, onSetWordEnd }: {
  ghost: GhostLine;
  tone: 'next' | 'prev';
  caption: string;
  view: View;
  onSelect?: () => void;
  action?: ReactNode;
  /** The earliest this line's first word may start (the line before it has to start first). */
  floor: number;
  /** The song time under a pointer, snapped the way the footer says. */
  timeAt: (clientX: number) => number;
  /** The end of the track. */
  cap: number;
  onSetWordTime?: (wordIndex: number, time: number) => void;
  onSetWordEnd?: (wordIndex: number, end: number | null) => void;
}) {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState<number | null>(null);
  const [draggingEnd, setDraggingEnd] = useState<number | null>(null);
  const start = ghost.line.timestamp;
  const words = ghost.line.words ?? [];
  const segments = start != null && ghost.end != null && ghost.end > start && words.length
    ? layoutWords(words, start, ghost.end)
    : [];
  const pct = (time: number) => ((time - view.from) / view.span) * 100;
  // A word stays between the timed words around it, and the first one after the line before.
  const clamp = (index: number, time: number) => {
    const before = words.slice(0, index).reverse().find((w) => w.time != null)?.time;
    const after = words.slice(index + 1).find((w) => w.time != null)?.time;
    const min = (before ?? floor) + MIN_WORD_GAP;
    const max = Math.min(after ?? Infinity, ghost.end ?? Infinity) - MIN_WORD_GAP;
    return Number(Math.max(min, Math.min(Math.max(min, max), time)).toFixed(3));
  };
  const move = (index: number, time: number) => {
    const next = clamp(index, time);
    if (next !== words[index].time) onSetWordTime?.(index, next);
  };
  // The right edge: a pause before the next word, or, for the line's last word, on past the
  // start of the line after it.
  const moveEnd = (index: number, raw: number) => {
    const hold = index === words.length - 1 ? ghost.holdLimit ?? null : null;
    const next = wordEndAt(segments[index], raw, hold, cap);
    if (next !== (words[index].end ?? null)) onSetWordEnd?.(index, next);
  };
  const edgeTag = 'pointer-events-none absolute top-0 rounded-md bg-foam px-[7px] py-[3px] font-mono text-[11px] leading-none font-semibold tabular-nums whitespace-nowrap text-background';
  const block = tone === 'next'
    ? 'border-primary/60 bg-primary/10 text-foreground/80'
    : 'border-foam/60 bg-foam/10 text-foreground/80';
  return (
    <div data-ghost={tone} className="flex h-12 shrink-0 border-b border-hl/40 bg-background/40 last:border-b-0">
      <div className="flex w-[var(--label-w)] shrink-0 items-center gap-1 border-r border-hl/60 pl-3 pr-1">
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-md text-left focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus"
        >
          <span className={`text-[10px] font-bold uppercase tracking-[0.08em] ${tone === 'next' ? 'text-primary' : 'text-foam'}`}>{caption}</span>
          <span className="w-full truncate text-[13px] font-semibold text-foreground/80">{ghost.line.text}</span>
        </button>
        {action}
      </div>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        {onSetWordTime && segments.map((seg, k) => (seg.timed && (
          <span
            key={`edge-${k}`}
            role="slider"
            tabIndex={0}
            aria-label={t('editor.words.boundaryLabel', { word: seg.word })}
            aria-valuemin={Number(floor.toFixed(2))}
            aria-valuemax={Number((ghost.end ?? seg.to).toFixed(2))}
            aria-valuenow={Number(seg.from.toFixed(2))}
            onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setDragging(k); }}
            onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) move(k, timeAt(e.clientX)); }}
            onPointerUp={() => setDragging(null)}
            onPointerCancel={() => setDragging(null)}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 0.01 : 0.05;
              const delta = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
              if (!delta) return;
              e.preventDefault();
              e.stopPropagation();
              move(k, seg.from + delta);
            }}
            className="group absolute inset-y-0 z-10 grid w-3 -translate-x-1/2 cursor-ew-resize touch-none place-items-center focus-visible:outline-none coarse:w-11"
            style={{ left: `${pct(seg.from)}%` }}
          >
            <span className={`h-3/5 w-1 rounded-pill transition-colors group-hover:bg-foreground group-focus-visible:bg-foreground ${dragging === k ? 'bg-foreground' : tone === 'next' ? 'bg-primary/70' : 'bg-foam/70'}`} />
            {dragging === k && (
              <span className="pointer-events-none absolute top-0 left-2 rounded-md bg-foam px-[7px] py-[3px] font-mono text-[11px] leading-none font-semibold tabular-nums whitespace-nowrap text-background">
                {formatTime(seg.from)}
              </span>
            )}
          </span>
        )))}
        {onSetWordEnd && segments.map((seg, k) => (seg.timed && (
          <span
            key={`end-${k}`}
            role="slider"
            tabIndex={0}
            aria-label={t('editor.words.endLabel', { word: seg.word })}
            aria-valuemin={Number(seg.from.toFixed(2))}
            aria-valuemax={Number((k === words.length - 1 && ghost.holdLimit != null ? cap : seg.gapTo).toFixed(2))}
            aria-valuenow={Number(seg.to.toFixed(2))}
            onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setDraggingEnd(k); }}
            onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) moveEnd(k, timeAt(e.clientX)); }}
            onPointerUp={() => setDraggingEnd(null)}
            onPointerCancel={() => setDraggingEnd(null)}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 0.01 : 0.05;
              const delta = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
              if (!delta) return;
              e.preventDefault();
              e.stopPropagation();
              moveEnd(k, Number((seg.to + delta).toFixed(3)));
            }}
            // Narrower than the start handle and set just inside the chip, so where two chips
            // meet each edge can still be picked.
            className="group absolute inset-y-0 z-10 grid w-2 -translate-x-full cursor-ew-resize touch-none place-items-center focus-visible:outline-none coarse:w-8"
            style={{ left: `${pct(seg.to)}%` }}
          >
            <span className={`h-2/5 w-[3px] rounded-pill transition-colors group-hover:bg-foreground group-focus-visible:bg-foreground ${draggingEnd === k ? 'bg-foreground' : seg.hasEnd ? (tone === 'next' ? 'bg-primary/70' : 'bg-foam/70') : 'bg-transparent'}`} />
            {draggingEnd === k && <span className={`${edgeTag} right-2`}>{formatTime(seg.to)}</span>}
          </span>
        )))}
        {segments.length > 0
          ? segments.map((seg, k) => (seg.to - seg.from > 0 && (
            <span
              key={k}
              aria-hidden
              // The previous line is cut off on the left, so its words read from their right end.
              className={`absolute inset-y-2.5 flex items-center overflow-hidden rounded-md border border-dashed px-1.5 text-xs font-semibold whitespace-nowrap ${tone === 'prev' ? 'justify-end' : ''} ${block}`}
              style={{ left: `calc(${pct(seg.from)}% + 1px)`, width: `max(0px, calc(${pct(seg.to) - pct(seg.from)}% - 2px))` }}
            >
              <span className="truncate">{seg.word}</span>
            </span>
          )))
          : start != null && ghost.end != null && ghost.end > start && (
            <span
              aria-hidden
              className={`absolute inset-y-2.5 flex items-center overflow-hidden rounded-md border border-dashed px-2 text-xs font-semibold whitespace-nowrap ${block}`}
              style={{ left: `calc(${pct(start)}% + 1px)`, width: `max(0px, calc(${pct(ghost.end) - pct(start)}% - 2px))` }}
            >
              <span className="truncate">{ghost.line.text}</span>
            </span>
          )}
      </div>
    </div>
  );
}

/**
 * The focused line as one row per word: the word itself (with its furigana, start time and
 * menu) on the left, and on the right a block as long as the word lasts. Dragging a block's left
 * edge moves where the word starts; its right edge moves where it stops, leaving a pause before
 * the next word. Words with no time yet share what is left of the line evenly and cannot be dragged.
 *
 * The time axis is the song's, not the line's: it opens on the focused line and scrolls sideways
 * to the lines around it, which show as bands in the lane above the words and as dimmed rows
 * beside them. That is what lets the last word be dragged past the start of the next line, for
 * a singer who is still on it when the next line begins.
 */
export function WordTimeline({
  line, lineEnd, naturalEnd: naturalEndProp, duration, lineKey, lineIndex, bands, nextLine, prevLine, onSelectLine, onChangeLineTiming, onEndPrevious,
  playbackPosition, isPlaying, activeWordIndex, selectedWordIndex, playingWordIndex,
  onSetWordTime, onSetWordEnd, onSetNeighbourWordTime, onSetNeighbourWordEnd, startFloor = 0, onSelectWord, onEditLine, markKey, onPlayFrom, wordMenu, footerEnd, hints,
}: WordTimelineProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const format = settings.editor?.display?.readingFormat;
  const trackRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  // The song-wide scrollbar under the rows.
  const hScrollRef = useRef<HTMLDivElement>(null);
  // Dragging the ruler pans the view: where the drag started and the view at that moment.
  const panRef = useRef<{ x: number; from: number } | null>(null);
  // Which edge is being dragged. The time is written to the line on every move; the undo history
  // groups changes that arrive in quick succession, so a drag is still one step back.
  const [drag, setDrag] = useState<{ index: number; edge: 'start' | 'end' } | null>(null);
  // A line chip in the lines lane being dragged: by one edge, or by its body to move the whole line.
  const [laneDrag, setLaneDrag] = useState<{ index: number; part: 'start' | 'end' | 'move' } | null>(null);
  const laneRef = useRef<{ part: 'start' | 'end' | 'move'; index: number; grab: number; from: number; to: number; x: number; moved: boolean } | null>(null);
  const [snap, setSnap] = usePersisted<SnapMode>('lrc.words.snap', 'edges');
  const [showSyllables, setShowSyllables] = usePersisted('lrc.words.syllables', true);
  const [peaksVersion, setPeaksVersion] = useState(0);

  useEffect(() => {
    const onPeaks = () => setPeaksVersion((v) => v + 1);
    window.addEventListener(PEAKS_EVENT, onPeaks);
    return () => window.removeEventListener(PEAKS_EVENT, onPeaks);
  }, []);

  const start = line.timestamp;
  const words = useMemo(() => line.words ?? [], [line.words]);
  const span = start != null && lineEnd != null && lineEnd > start ? lineEnd - start : null;
  const end = start != null && span != null ? start + span : null;
  const naturalEnd = naturalEndProp ?? end;
  const nextStart = nextLine?.line.timestamp ?? null;
  // The stretch of time the axis can scroll over: the track, or as far as the lines reach.
  const total = Math.max(
    duration ?? 0,
    (end ?? 0) + 1,
    bands?.length ? bands[bands.length - 1].to : 0,
    nextLine?.end ?? 0,
    MIN_SPAN,
  );
  const lastWordTime = words.reduce<number | null>((last, w) => (w.time != null ? w.time : last), null);
  // As much of the line as the view has to show for the line to count as in view.
  const shownEnd = start != null && end != null && end - start > LONG_LINE
    ? Math.min(end, Math.max((lastWordTime ?? start) + 4, start + 8))
    : end;
  const fit = start != null && shownEnd != null ? fitView(start, shownEnd) : null;
  const clampView = (v: View): View => {
    const viewSpan = Math.min(Math.max(MIN_SPAN, v.span), Math.max(MIN_SPAN, total));
    return { span: viewSpan, from: Math.min(Math.max(0, v.from), Math.max(0, total - viewSpan)) };
  };

  const [view, setView] = useState<View>(() => (fit ? clampView(fit) : { from: 0, span: 10 }));
  // True until the zoom buttons are used: the view then keeps its own width from line to line.
  const [autoFit, setAutoFit] = useState(true);
  // Where the axis is sliding to after another line took the focus.
  const [glide, setGlide] = useState<View | null>(null);
  const viewRef = useRef(view);
  useLayoutEffect(() => { viewRef.current = view; });

  // Another line took the focus (or this one just got its start). A line that already fits in
  // view leaves the axis alone; otherwise the axis slides to it. Decided during render (React's
  // pattern for state that follows a prop), so the first frame already knows where it is going.
  const viewKey = `${lineKey ?? line.id ?? ''}|${fit != null}`;
  const [seenKey, setSeenKey] = useState(viewKey);
  if (viewKey !== seenKey) {
    setSeenKey(viewKey);
    if (fit && start != null && shownEnd != null) {
      const inView = start >= view.from - 1e-6 && shownEnd <= view.from + view.span + 1e-6;
      if (!inView) setGlide(clampView(autoFit ? fit : { from: start - view.span * 0.15, span: view.span }));
    }
  }
  useEffect(() => {
    if (!glide) return;
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const origin = viewRef.current;
    const t0 = performance.now();
    let frame = requestAnimationFrame(function step(now: number) {
      const k = reduce ? 1 : Math.min(1, Math.max(0, (now - t0) / GLIDE_MS));
      const eased = 1 - (1 - k) ** 3;
      setView({ from: origin.from + (glide.from - origin.from) * eased, span: origin.span + (glide.span - origin.span) * eased });
      if (k < 1) frame = requestAnimationFrame(step);
      else setGlide(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [glide]);

  // While the song plays the axis follows the playhead: once it nears the right edge the view
  // pages on so it sits a fifth of the way in, and a loop that sent it back to the line's start
  // brings the view back with it. A view the user scrolled elsewhere is left alone.
  if (isPlaying && !glide && !drag && fit) {
    const viewTo = view.from + view.span;
    const leaving = playbackPosition > viewTo - view.span * 0.05 && playbackPosition < viewTo + 1;
    const loopedBack = start != null && end != null && playbackPosition >= start && playbackPosition <= end && playbackPosition < view.from;
    if (leaving || loopedBack) {
      const next = clampView({ from: playbackPosition - view.span * 0.2, span: view.span });
      if (Math.abs(next.from - view.from) > 1e-6) setView(next);
    }
  }

  const segments = useMemo(
    () => (start == null || end == null ? [] : layoutWords(words, start, end)),
    [words, start, end],
  );

  // The waveform under the view, normalised to its own loudest moment.
  const viewFrom = view.from;
  const viewSpan = view.span;
  const wave = useMemo(() => {
    void peaksVersion;
    const cached = getCachedPeaks();
    const channel = cached?.peaks[0];
    if (!cached || !channel?.length || !cached.duration) return null;
    const out: number[] = [];
    let max = 0;
    for (let b = 0; b < WAVE_BINS; b++) {
      const from = Math.floor(((viewFrom + (viewSpan * b) / WAVE_BINS) / cached.duration) * channel.length);
      const to = Math.max(from + 1, Math.ceil(((viewFrom + (viewSpan * (b + 1)) / WAVE_BINS) / cached.duration) * channel.length));
      let m = 0;
      for (let i = Math.max(0, from); i < to && i < channel.length; i++) m = Math.max(m, Math.abs(channel[i]));
      out.push(m);
      max = Math.max(max, m);
    }
    if (!max) return null;
    return out.map((v, b) => {
      const h = (v / max) * 92;
      return `M${b} ${50 - h / 2}h0.7v${h}h-0.7z`;
    }).join('');
  }, [peaksVersion, viewFrom, viewSpan]);

  if (start == null || span == null || end == null || fit == null || words.length === 0) {
    return (
      <EmptyState
        art="words"
        words={words.map((w) => w.word ?? '').filter(Boolean)}
        title={t('editor.words.emptyTitle')}
        description={<Trans i18nKey="editor.words.emptyDesc" values={{ key: markKey }} components={[<Kbd key="0" />]} />}
      />
    );
  }

  const pct = (time: number) => ((time - view.from) / view.span) * 100;
  const viewTo = view.from + view.span;
  const moveView = (next: View) => { setGlide(null); setView(clampView(next)); };

  const timeAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return start;
    return view.from + Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * view.span;
  };
  const snapReach = () => {
    const width = trackRef.current?.getBoundingClientRect().width ?? 0;
    return width ? (SNAP_PX / width) * view.span : 0;
  };
  // A word stays after the timed word before it (and its end) and before the one after it;
  // the first and last are held by the line's own start and end instead.
  const clampStart = (index: number, time: number) => {
    const before = words.slice(0, index).reverse().find((w) => w.time != null)?.time;
    const after = words.slice(index + 1).find((w) => w.time != null)?.time;
    // The first word carries the line's start with it, so it may go earlier than the line does
    // now: as far back as the last word of the line before.
    const min = before != null ? Math.max(start, before + MIN_WORD_GAP) : index === 0 ? Math.min(start, startFloor + MIN_WORD_GAP) : start;
    const ownEnd = segments[index]?.hasEnd ? segments[index].to : Infinity;
    const max = Math.min(end, after ?? Infinity, ownEnd) - MIN_WORD_GAP;
    return Math.max(min, Math.min(Math.max(min, max), time));
  };
  // The last word, when a line follows: the one whose end may run on over that line.
  const tailIndex = nextStart != null && naturalEnd != null && words[words.length - 1]?.time != null ? words.length - 1 : -1;
  const overlap = nextStart != null && end - nextStart > 0.005 ? end - nextStart : null;
  // What a dragged edge can catch on: the other words' edges, the line's own, and the next line's start.
  const edgesExcept = (index: number) => segments
    .flatMap((s, k) => (k === index || !s.timed ? [] : [s.from, s.to]))
    .concat(start, naturalEnd ?? end, nextStart ?? []);
  // Where a word's end goes when it is put at `raw`. Up against the word after it the end goes
  // away (the word runs into it again); the last word may go on past the next line's start.
  const applyEnd = (index: number, raw: number) => {
    const next = wordEndAt(segments[index], raw, index === tailIndex ? (naturalEnd as number) : null, total);
    if (next !== (words[index].end ?? null)) onSetWordEnd(index, next);
  };

  // A neighbouring line's word catches on this line's words and on where this line stops, so
  // the next line's start can be dropped right on the end of the last word to close an overlap.
  const neighbourTimeAt = (clientX: number) => snapTime(
    timeAt(clientX), snap, snapReach(), playbackPosition,
    segments.flatMap((s) => (s.timed ? [s.from, s.to] : [])).concat(end),
  );
  // ── The lines lane: a line's chip moves the whole line, its edges change where it starts or ends ──
  const laneEdges = (except: number) => (bands ?? []).filter((b) => b.index !== except).flatMap((b) => [b.from, b.to]);
  const laneDown = (band: LineBand, part: 'start' | 'end' | 'move') => (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setGlide(null);
    laneRef.current = { part, index: band.index, grab: timeAt(e.clientX), from: band.from, to: band.to, x: e.clientX, moved: false };
    setLaneDrag({ index: band.index, part });
  };
  const laneMove = (band: LineBand, part: 'start' | 'end' | 'move') => (e: PointerEvent<HTMLElement>) => {
    const d = laneRef.current;
    if (!d || d.index !== band.index || d.part !== part) return;
    if (e.currentTarget.hasPointerCapture && !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    // A press that barely moves is a click, which gives the line the focus on release.
    if (Math.abs(e.clientX - d.x) > 3) d.moved = true;
    if (!d.moved) return;
    const at = timeAt(e.clientX);
    const edges = laneEdges(band.index);
    const reach = snapReach();
    if (part === 'move') {
      const raw = d.from + (at - d.grab);
      const length = d.to - d.from;
      // Either end of the chip may catch on something; whichever did moves the line.
      const a = snapTime(raw, snap, reach, playbackPosition, edges);
      const b = snapTime(raw + length, snap, reach, playbackPosition, edges) - length;
      const da = Math.abs(a - raw);
      const db = Math.abs(b - raw);
      const start = da > 1e-9 && (db <= 1e-9 || da <= db) ? a : db > 1e-9 ? b : raw;
      onChangeLineTiming?.(band.index, { kind: 'move', start });
    } else {
      onChangeLineTiming?.(band.index, { kind: part, time: snapTime(at, snap, reach, playbackPosition, edges) });
    }
  };
  const laneUp = (band: LineBand, part: 'start' | 'end' | 'move') => () => {
    const d = laneRef.current;
    laneRef.current = null;
    setLaneDrag(null);
    if (part === 'move' && d && !d.moved && band.index !== lineIndex) onSelectLine?.(band.index);
  };
  const laneKeys = (band: LineBand, part: 'start' | 'end') => (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.01 : 0.05;
    const delta = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    if (!delta) return;
    e.preventDefault();
    e.stopPropagation();
    onChangeLineTiming?.(band.index, { kind: part, time: Number(((part === 'start' ? band.from : band.to) + delta).toFixed(3)) });
  };
  // The time of the edge being dragged, shown on the ruler.
  const draggedBand = laneDrag ? (bands ?? []).find((b) => b.index === laneDrag.index) : undefined;
  const laneTagTime = draggedBand && laneDrag ? (laneDrag.part === 'end' ? draggedBand.to : draggedBand.from) : null;

  const handlePointerDown = (index: number, edge: 'start' | 'end') => (e: PointerEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setGlide(null);
    setDrag({ index, edge });
  };
  const handlePointerMove = (index: number, edge: 'start' | 'end') => (e: PointerEvent<HTMLSpanElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const pointed = timeAt(e.clientX);
    const reach = snapReach();
    let raw = snapTime(pointed, snap, reach, playbackPosition, edgesExcept(index));
    if (edge === 'start') {
      const time = Number(clampStart(index, raw).toFixed(3));
      if (time !== words[index].time) onSetWordTime(index, time);
    } else {
      // The next line's start always catches the last word's end (unless snapping is off):
      // letting go there is how two lines are kept apart.
      if (index === tailIndex && snap !== 'off' && Math.abs(pointed - (naturalEnd as number)) <= reach) raw = naturalEnd as number;
      applyEnd(index, raw);
    }
  };
  const handlePointerUp = () => setDrag(null);
  const nudgeStart = (index: number, delta: number) => {
    const time = words[index].time;
    if (time != null) onSetWordTime(index, Number(clampStart(index, time + delta).toFixed(3)));
  };
  const edgeKeys = (index: number, edge: 'start' | 'end') => (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.01 : 0.05;
    const delta = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    if (!delta) return;
    e.preventDefault();
    e.stopPropagation();
    if (edge === 'start') nudgeStart(index, delta); else applyEnd(index, Number((segments[index].to + delta).toFixed(3)));
  };

  // How many seconds a horizontal move of `px` pixels is on the axis.
  const secondsPerPx = () => {
    const width = trackRef.current?.getBoundingClientRect().width ?? 0;
    return width > 0 ? view.span / width : 0;
  };
  const panBy = (px: number) => moveView({ from: view.from + px * secondsPerPx(), span: view.span });
  // Over the rows a sideways wheel (or Shift+wheel) scrolls through the song; over the ruler and
  // the lines lane, which have nothing to scroll up or down, any wheel does.
  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (delta) panBy(delta);
  };
  const handleRulerWheel = (e: WheelEvent<HTMLDivElement>) => {
    panBy(Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY);
  };
  const handleRulerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setGlide(null);
    panRef.current = { x: e.clientX, from: view.from };
  };
  const handleRulerMove = (e: PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    moveView({ from: pan.from - (e.clientX - pan.x) * secondsPerPx(), span: view.span });
  };
  const handleRulerUp = () => { panRef.current = null; };
  // The scrollbar covers the whole song. Pressing the track centres the view there; dragging
  // pans; arrows and Home/End step.
  const scrollRange = Math.max(0, total - view.span);
  const scrollFromTrack = (clientX: number) => {
    const rect = hScrollRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    moveView({ from: ((clientX - rect.left) / rect.width) * total - view.span / 2, span: view.span });
  };
  const handleTrackDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    scrollFromTrack(e.clientX);
  };
  const handleTrackMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) scrollFromTrack(e.clientX);
  };
  const handleTrackKey = (e: KeyboardEvent) => {
    const next = e.key === 'ArrowLeft' ? view.from - view.span / 4 : e.key === 'ArrowRight' ? view.from + view.span / 4
      : e.key === 'PageUp' ? view.from - view.span : e.key === 'PageDown' ? view.from + view.span
        : e.key === 'Home' ? 0 : e.key === 'End' ? scrollRange : null;
    if (next == null) return;
    e.preventDefault();
    e.stopPropagation();
    moveView({ from: next, span: view.span });
  };
  const maxSpan = Math.min(Math.max(MIN_SPAN, total), Math.max(MAX_SPAN, fit.span));
  const changeZoom = (dir: 1 | -1) => {
    const nextSpan = Math.min(maxSpan, Math.max(MIN_SPAN, dir === 1 ? view.span / ZOOM_STEP : view.span * ZOOM_STEP));
    if (Math.abs(nextSpan - view.span) < 1e-6) return;
    // The zoom holds on to the playhead when it is in view, else to the picked word.
    const focusTime = playbackPosition >= view.from && playbackPosition <= viewTo
      ? playbackPosition
      : segments[selectedWordIndex ?? Math.max(0, activeWordIndex)]?.from ?? start;
    const at = Math.min(1, Math.max(0, (focusTime - view.from) / view.span));
    setAutoFit(false);
    moveView({ from: focusTime - at * nextSpan, span: nextSpan });
  };
  const fitLine = () => { setAutoFit(true); moveView(fit); };
  const zoomPct = Math.round((fit.span / view.span) * 100);

  const playheadIn = playbackPosition >= view.from && playbackPosition <= viewTo;
  // Ruler ticks sit on absolute song time (multiples of the step), so two lines line up the same way.
  const tickStep = view.span <= 20 ? RULER_TICK : 0.5;
  const labelStep = view.span <= 4 ? 0.25 : view.span <= 8 ? 0.5 : view.span <= 20 ? 1 : 5;
  const ticks: { pct: number; label: string | null }[] = [];
  for (let k = Math.ceil(view.from / tickStep - 1e-9); k * tickStep <= viewTo + 1e-9; k++) {
    const time = Math.round(k * tickStep * 1000) / 1000;
    const rem = time / labelStep;
    ticks.push({ pct: pct(time), label: Math.abs(rem - Math.round(rem)) < 1e-6 ? time.toFixed(labelStep < 0.5 ? 2 : 1) : null });
  }
  const boundaries = [...segments.filter((s) => s.timed).map((s) => s.from), naturalEnd ?? end];
  const tooShortCount = segments.filter((s) => s.timed && s.to - s.from < TOO_SHORT).length;
  const visibleBands = (bands ?? []).filter((b) => b.to > view.from && b.from < viewTo);
  // Long lines get shorter rows and smaller type so the whole line still fits on screen.
  const compact = words.length > 9;

  const toolButton = 'grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-subtle hover:bg-overlay hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus disabled:opacity-40 disabled:hover:bg-transparent';
  const timeTag = 'pointer-events-none absolute top-0 rounded-md bg-foam px-[7px] py-[3px] font-mono text-[11px] leading-none font-semibold tabular-nums whitespace-nowrap text-background';

  return (
    <section
      data-tour="words-timeline"
      aria-label={t('editor.words.timelineLabel')}
      // The label column is narrower on small screens; the track overlay reads the same variable.
      className="[--label-w:150px] lg:[--label-w:240px] flex min-h-0 flex-1 flex-col rounded-[var(--radius-card)] bg-card inset-ring inset-ring-hl"
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Header: the ruler with the playhead's time. Dragging it scrolls through the song. */}
        <div className="flex h-9 shrink-0 border-b border-hl/60">
          <div className="flex w-[var(--label-w)] shrink-0 items-center justify-between border-r border-hl/60 px-3">
            <span className={CAPTION}>{t('editor.words.colWord')}</span>
            <span className={CAPTION}>{t('editor.inspector.start')}</span>
          </div>
          <div
            ref={trackRef}
            className="relative min-w-0 flex-1 cursor-grab touch-none overflow-hidden select-none active:cursor-grabbing"
            onWheel={handleRulerWheel}
            onPointerDown={handleRulerDown}
            onPointerMove={handleRulerMove}
            onPointerUp={handleRulerUp}
            onPointerCancel={handleRulerUp}
          >
            <div aria-hidden className="absolute inset-0 font-mono text-[10px] text-subtle">
              {ticks.map((tick, k) => (
                <span key={k} className="absolute bottom-0" style={{ left: `${tick.pct}%` }}>
                  <span className={`absolute bottom-0 w-px -translate-x-1/2 ${tick.label ? 'h-[9px] bg-subtle' : 'h-1 bg-faint'}`} />
                  {tick.label && <span className="absolute bottom-2.5 -translate-x-1/2 tabular-nums">{tick.label}</span>}
                </span>
              ))}
            </div>
            {playheadIn && (
              <span className="absolute top-1 z-10 -translate-x-1/2 rounded-md bg-foam px-[7px] py-[3px] font-mono text-[11px] leading-none font-semibold tabular-nums text-background" style={{ left: `${pct(playbackPosition)}%` }}>
                {formatTime(playbackPosition)}
              </span>
            )}
            {laneTagTime != null && laneTagTime >= view.from && laneTagTime <= viewTo && (
              <span className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-md bg-primary px-[7px] py-[3px] font-mono text-[11px] leading-none font-semibold tabular-nums text-primary-foreground" style={{ left: `${pct(laneTagTime)}%` }}>
                {formatTime(laneTagTime)}
              </span>
            )}
          </div>
        </div>

        {/* The lines around this one, as bands in time. A line that starts while the one before
            it still sounds drops to the second lane, so an overlap is two bands side by side. */}
        {bands && bands.length > 0 && (
          <div className="flex h-[52px] shrink-0 border-b border-hl/60 bg-background/40">
            <div className="flex w-[var(--label-w)] shrink-0 items-center border-r border-hl/60 px-3">
              <span className={CAPTION}>{t('editor.words.linesLane')}</span>
            </div>
            <div className="relative min-w-0 flex-1 overflow-hidden" onWheel={handleRulerWheel}>
              {visibleBands.map((band) => {
                const focused = band.index === lineIndex;
                const isNext = band.index === nextLine?.index;
                // Drag the chip to move the line, its edges to change where it starts or ends.
                const editable = !!onChangeLineTiming && !band.counterpart;
                const grip = (part: 'start' | 'end') => (
                  <span
                    role="slider"
                    tabIndex={0}
                    aria-label={t(part === 'start' ? 'editor.words.lineStartLabel' : 'editor.words.lineEndLabel', { number: band.number })}
                    aria-valuemin={0}
                    aria-valuemax={Number(total.toFixed(2))}
                    aria-valuenow={Number((part === 'start' ? band.from : band.to).toFixed(2))}
                    onPointerDown={laneDown(band, part)}
                    onPointerMove={laneMove(band, part)}
                    onPointerUp={laneUp(band, part)}
                    onPointerCancel={laneUp(band, part)}
                    onKeyDown={laneKeys(band, part)}
                    className={`group/grip absolute inset-y-0 z-10 grid w-2 cursor-ew-resize touch-none place-items-center focus-visible:outline-none coarse:w-6 ${part === 'start' ? 'left-0' : 'right-0'}`}
                  >
                    <span className={`h-3/5 w-[3px] rounded-pill transition-colors group-hover/band:bg-foreground/40 group-focus-visible/grip:bg-foreground group-hover/grip:bg-foreground ${laneDrag?.index === band.index && laneDrag.part === part ? 'bg-foreground' : 'bg-transparent'}`} />
                  </span>
                );
                return (
                  <div
                    key={band.index}
                    data-band={band.index}
                    className={`group/band absolute h-5 ${band.lane ? 'top-[27px]' : 'top-[5px]'}`}
                    style={{ left: `calc(${pct(band.from)}% + 1px)`, width: `max(0px, calc(${pct(band.to) - pct(band.from)}% - 2px))` }}
                  >
                    <button
                      type="button"
                      aria-current={focused ? 'true' : undefined}
                      aria-label={t('editor.words.goToLine', { number: band.number, text: band.text })}
                      // A pointer click is told apart from a drag on release; this is the keyboard's way in.
                      onClick={(e) => { if (e.detail === 0 && !focused) onSelectLine?.(band.index); }}
                      onPointerDown={editable ? laneDown(band, 'move') : undefined}
                      onPointerMove={editable ? laneMove(band, 'move') : undefined}
                      onPointerUp={editable ? laneUp(band, 'move') : () => { if (!focused) onSelectLine?.(band.index); }}
                      onPointerCancel={editable ? laneUp(band, 'move') : undefined}
                      className={`absolute inset-0 flex items-center gap-1.5 overflow-hidden rounded-md text-left text-[11px] font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus ${editable ? 'cursor-grab touch-none px-2.5 active:cursor-grabbing' : 'px-1.5'} ${focused
                        ? 'bg-foam/20 text-foreground inset-ring-[1.5px] inset-ring-foam'
                        : isNext && overlap != null
                          ? 'bg-primary/15 text-foreground inset-ring inset-ring-primary/70 hover:brightness-125'
                          : 'bg-raised text-foreground/80 inset-ring inset-ring-hl hover:brightness-125'}`}
                    >
                      <span className="font-mono text-[10px] font-normal tabular-nums text-foreground/65">{band.number}</span>
                      <span className="truncate">{band.text}</span>
                    </button>
                    {editable && grip('start')}
                    {editable && grip('end')}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* One row per word, sharing the height the editor has. Rows shrink for long lines and only
            scroll once even the smallest rows no longer fit. */}
        <div className="lrc-scroll relative flex min-h-0 flex-1 flex-col overflow-y-auto">
          {/* Waveform, guides and playhead cross every row; they ignore the pointer so the edges stay draggable. */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[var(--label-w)] right-0 overflow-hidden">
            {wave && (
              <svg viewBox={`0 0 ${WAVE_BINS} 100`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-foreground/[0.07]">
                <path d={wave} fill="currentColor" />
              </svg>
            )}
            {/* Outside the line the track is dimmed: that time belongs to its neighbours. */}
            <span className="absolute inset-y-0 left-0 bg-background/45" style={{ width: `${Math.max(0, pct(start))}%` }} />
            <span className="absolute inset-y-0 right-0 bg-background/45" style={{ width: `${Math.max(0, 100 - pct(end))}%` }} />
            {boundaries.map((time, k) => (
              <span key={k} className="absolute inset-y-0 border-l border-dashed border-faint/50" style={{ left: `${pct(time)}%` }} />
            ))}
            {overlap != null && nextStart != null && (
              <span
                data-overlap
                className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,color-mix(in_oklab,var(--primary)_28%,transparent)_0_2px,transparent_2px_8px)]"
                style={{ left: `${pct(nextStart)}%`, width: `${pct(end) - pct(nextStart)}%` }}
              />
            )}
            {nextStart != null && nextLine && (
              <span className="absolute inset-y-0 border-l-2 border-primary" style={{ left: `${pct(nextStart)}%` }}>
                <span className="absolute top-1.5 left-1.5 rounded-md bg-primary px-1.5 py-0.5 text-[11px] leading-tight font-bold whitespace-nowrap text-primary-foreground">
                  {t('editor.words.lineStarts', { number: nextLine.number, time: formatTime(nextStart) })}
                </span>
              </span>
            )}
            {playheadIn && (
              <span className="absolute inset-y-0 z-20 w-0.5 -translate-x-1/2 rounded-pill bg-foam shadow-[0_0_8px_var(--foam)]" style={{ left: `${pct(playbackPosition)}%` }} />
            )}
          </div>

          {prevLine && (
            <GhostRow
              ghost={prevLine}
              tone="prev"
              caption={t('editor.words.ghostPrev', { number: prevLine.number })}
              view={view}
              floor={0}
              cap={total}
              timeAt={neighbourTimeAt}
              onSetWordTime={onSetNeighbourWordTime && ((wi, time) => onSetNeighbourWordTime(prevLine.index, wi, time))}
              onSetWordEnd={onSetNeighbourWordEnd && ((wi, to) => onSetNeighbourWordEnd(prevLine.index, wi, to))}
              onSelect={() => onSelectLine?.(prevLine.index)}
              action={onEndPrevious && (
                <Tip content={t('editor.words.endPreviousTip')}>
                  <button
                    type="button"
                    onClick={onEndPrevious}
                    className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-foam inset-ring inset-ring-foam/60 hover:bg-foam/10 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus"
                  >
                    {t('editor.words.endPrevious')}
                  </button>
                </Tip>
              )}
            />
          )}

          {segments.map((seg, i) => {
            const w = words[i];
            const isNext = i === activeWordIndex;
            const isPlayingWord = i === playingWordIndex;
            const isSelected = i === selectedWordIndex;
            const length = seg.to - seg.from;
            // A timed word this short is almost certainly a mis-stamp or an overlap with its neighbour.
            const tooShort = seg.timed && length < TOO_SHORT;
            const within = isPlayingWord && length > 0 ? Math.min(1, (playbackPosition - seg.from) / length) : null;
            const kana = showSyllables && seg.timed ? wordKana(w) : null;
            const morae = kana ? splitMorae(kana) : [];
            const highlight = isSelected || isPlayingWord;
            const playable = seg.timed && !!onPlayFrom;
            const BlockTag = playable ? 'button' : 'span';
            const isTail = i === tailIndex;
            // How far this word runs on over the next line.
            const over = isTail && nextStart != null && seg.to - nextStart > 0.005 ? seg.to - nextStart : null;
            const draggingEnd = drag?.index === i && drag.edge === 'end';
            return (
              <ContextMenu key={i}>
                <ContextMenuTrigger asChild>
                  <div
                    // The tour points at the first word's row to explain a row: name, start, menu, block.
                    data-tour={i === 0 ? 'words-row' : undefined}
                    ref={(el) => { rowRefs.current[i] = el; }}
                    className={`group/row relative flex flex-1 border-b border-hl/40 last:border-b-0 ${compact ? 'min-h-[26px] max-h-14' : 'min-h-[34px] max-h-20'} ${highlight ? 'bg-foam/[0.06]' : ''}`}
                  >
                    {/* The word: what the old chip was. */}
                    <div className="relative flex w-[var(--label-w)] shrink-0 items-center gap-1 border-r border-hl/60 pl-3 pr-1">
                      {(isSelected || isPlayingWord || isNext) && (
                        <span aria-hidden className={`absolute inset-y-1 left-0 w-[3px] rounded-r-sm ${isNext && !isSelected ? 'bg-primary' : 'bg-foam'}`} />
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectWord(i)}
                        onDoubleClick={onEditLine}
                        aria-pressed={isSelected}
                        className="flex h-full min-w-0 flex-1 items-center gap-2 rounded-md text-left focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus"
                      >
                        <span className={`w-4 shrink-0 text-right font-mono text-[10px] tabular-nums ${highlight ? 'text-foam' : 'text-subtle'}`}>{i + 1}</span>
                        <span
                          className={`min-w-0 flex-1 truncate font-heading font-semibold leading-[1.3] ${compact ? 'text-[15px]' : 'text-lg lg:text-[22px]'} ${w.reading ? (compact ? 'pt-2.5' : 'pt-3') : ''} ${highlight ? 'text-foam' : seg.timed ? 'text-foreground' : 'text-faint'}`}
                        >
                          <WordRuby word={w.word ?? ''} reading={w.reading} format={format} />
                        </span>
                        {tooShort && (
                          <Tip content={t('editor.words.tooShort', { word: seg.word, seconds: length.toFixed(2) })}>
                            <span role="img" aria-label={t('editor.words.tooShort', { word: seg.word, seconds: length.toFixed(2) })} className="grid shrink-0 text-gold"><Icon name="warning" size={14} /></span>
                          </Tip>
                        )}
                        {seg.timed ? (
                          <span className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${isSelected ? 'bg-foam text-background' : 'bg-raised text-foreground/80'}`}>
                            {formatTime(seg.from)}
                          </span>
                        ) : isNext ? (
                          <Kbd className="shrink-0">{markKey}</Kbd>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        aria-label={t('editor.words.wordActions', { word: seg.word })}
                        aria-haspopup="menu"
                        onClick={(e) => openContextMenuAt(rowRefs.current[i], e.currentTarget)}
                        className={`grid size-7 shrink-0 place-items-center rounded-md text-subtle hover:bg-overlay hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus coarse:opacity-100 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'}`}
                      >
                        <Icon name="more_vert" size={16} />
                      </button>
                    </div>

                    {/* Its time. */}
                    <div className="relative min-w-0 flex-1 overflow-hidden" onWheel={handleWheel}>
                      {seg.timed && seg.gapTo - seg.to > 0.005 && (
                        <Tip content={t('editor.words.gap', { seconds: (seg.gapTo - seg.to).toFixed(2) })}>
                          <span
                            className="absolute inset-y-[38%] rounded-sm bg-[repeating-linear-gradient(135deg,var(--hl)_0_2px,transparent_2px_6px)]"
                            style={{ left: `${pct(seg.to)}%`, width: `${pct(seg.gapTo) - pct(seg.to)}%` }}
                          />
                        </Tip>
                      )}
                      <BlockTag
                        // The whole block plays the word from its start: a stamped block is a button,
                        // an unstamped one has no time to play from and stays a plain shape.
                        {...(playable ? {
                          type: 'button' as const,
                          'aria-label': t('editor.words.playWord', { word: seg.word, time: formatTime(seg.from) }),
                          onClick: (e: ReactMouseEvent) => { e.stopPropagation(); onPlayFrom!(seg.from); },
                        } : {})}
                        // @container: what the block shows depends on how wide it is.
                        className={`@container absolute ${compact ? 'inset-y-[3px]' : 'inset-y-2'} flex items-center gap-2 overflow-hidden rounded-lg pl-3 pr-2 text-left whitespace-nowrap ${playable ? 'cursor-pointer transition-colors hover:brightness-125 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus' : ''} ${isSelected
                          ? 'bg-foam/25 inset-ring-[1.5px] inset-ring-foam'
                          : tooShort
                            ? 'bg-gold-soft text-gold-ink inset-ring-[1.5px] inset-ring-gold'
                            : isPlayingWord
                              ? 'bg-raised inset-ring-[1.5px] inset-ring-foam'
                              : seg.timed ? 'bg-raised inset-ring inset-ring-hl' : 'bg-card/60 text-faint [border:1px_dashed_var(--faint)]'}`}
                        style={{
                          left: `calc(${pct(seg.from)}% + 1px)`,
                          width: `max(0px, calc(${pct(seg.to) - pct(seg.from)}% - 2px))`,
                        }}
                      >
                        {/* How far playback is into this word. */}
                        {within != null && within > 0 && (
                          <span aria-hidden className="absolute inset-y-0 left-0 bg-foam/20" style={{ width: `${within * 100}%` }} />
                        )}
                        {morae.length > 1 ? (
                          <span aria-hidden className="absolute inset-0 flex">
                            {morae.map((m, k) => (
                              <span key={k} className={`flex min-w-0 flex-1 items-center pl-1.5 text-[11px] font-semibold ${k ? 'border-l border-dashed border-faint/60' : ''} ${isSelected ? 'text-foreground' : 'text-foam'}`}>
                                <span className="truncate">{compact ? '' : m}</span>
                              </span>
                            ))}
                          </span>
                        ) : (
                          seg.timed && (
                            <span className="relative hidden font-mono text-[11px] tabular-nums text-subtle @[84px]:inline">
                              {length.toFixed(2)} s
                            </span>
                          )
                        )}
                      </BlockTag>
                      {seg.timed && (
                        <>
                          <span
                            role="slider"
                            tabIndex={0}
                            aria-label={t('editor.words.boundaryLabel', { word: seg.word })}
                            aria-valuemin={Number(start.toFixed(2))}
                            aria-valuemax={Number(end.toFixed(2))}
                            aria-valuenow={Number(seg.from.toFixed(2))}
                            onPointerDown={handlePointerDown(i, 'start')}
                            onPointerMove={handlePointerMove(i, 'start')}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                            onKeyDown={edgeKeys(i, 'start')}
                            className="group absolute inset-y-0 z-10 grid w-3 -translate-x-1/2 cursor-ew-resize touch-none place-items-center focus-visible:outline-none coarse:w-11"
                            style={{ left: `${pct(seg.from)}%` }}
                          >
                            <span className={`h-3/4 w-1 rounded-pill transition-colors group-hover:bg-foreground group-focus-visible:bg-foreground ${drag?.index === i && drag.edge === 'start' ? 'bg-foreground' : isSelected ? 'bg-foam' : 'bg-faint'}`} />
                            {drag?.index === i && drag.edge === 'start' && (
                              <span className={`${timeTag} left-2`}>{formatTime(seg.from)}</span>
                            )}
                          </span>
                          <span
                            role="slider"
                            tabIndex={0}
                            aria-label={t('editor.words.endLabel', { word: seg.word })}
                            aria-valuemin={Number(seg.from.toFixed(2))}
                            aria-valuemax={Number((isTail ? total : seg.gapTo).toFixed(2))}
                            aria-valuenow={Number(seg.to.toFixed(2))}
                            aria-valuetext={over != null ? t('editor.words.overlapEdge', { time: formatTime(seg.to), seconds: over.toFixed(2) }) : undefined}
                            onPointerDown={handlePointerDown(i, 'end')}
                            onPointerMove={handlePointerMove(i, 'end')}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                            onKeyDown={edgeKeys(i, 'end')}
                            className="group absolute inset-y-0 z-10 grid w-2.5 -translate-x-1/2 cursor-ew-resize touch-none place-items-center focus-visible:outline-none coarse:w-8"
                            style={{ left: `${pct(seg.to)}%` }}
                          >
                            {/* The last word's end always shows: it is the handle that makes an overlap. */}
                            <span className={`h-1/2 w-[3px] rounded-pill transition-colors group-hover:bg-foreground group-focus-visible:bg-foreground ${draggingEnd ? 'bg-foreground' : seg.hasEnd || over != null ? 'bg-foam/80' : isTail ? 'bg-faint' : 'bg-transparent'}`} />
                            {draggingEnd && (
                              <span className={`${timeTag} right-2`}>
                                {over != null
                                  ? t('editor.words.overlapEdge', { time: formatTime(seg.to), seconds: over.toFixed(2) })
                                  : isTail && nextLine && Math.abs(seg.to - (naturalEnd as number)) <= 0.005
                                    ? t('editor.words.lineStarts', { number: nextLine.number, time: formatTime(seg.to) })
                                    : formatTime(seg.to)}
                              </span>
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-72">{wordMenu(i)}</ContextMenuContent>
              </ContextMenu>
            );
          })}

          {nextLine && (
            <GhostRow
              ghost={nextLine}
              tone="next"
              caption={t('editor.words.ghostNext', { number: nextLine.number })}
              view={view}
              floor={start}
              cap={total}
              timeAt={neighbourTimeAt}
              onSetWordTime={onSetNeighbourWordTime && ((wi, time) => onSetNeighbourWordTime(nextLine.index, wi, time))}
              onSetWordEnd={onSetNeighbourWordEnd && ((wi, to) => onSetNeighbourWordEnd(nextLine.index, wi, to))}
              onSelect={() => onSelectLine?.(nextLine.index)}
            />
          )}
        </div>

        {/* The whole song under the rows: its lines as a map, and the part in view as the thumb. */}
        <div className="flex h-6 shrink-0 items-center border-t border-hl/40">
          <div className="h-full w-[var(--label-w)] shrink-0 border-r border-hl/60" />
          <div className="min-w-0 flex-1 px-1">
            <div
              ref={hScrollRef}
              role="scrollbar"
              tabIndex={0}
              aria-label={t('editor.words.scroll')}
              aria-orientation="horizontal"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={scrollRange > 0 ? Math.round((view.from / scrollRange) * 100) : 0}
              onPointerDown={handleTrackDown}
              onPointerMove={handleTrackMove}
              onKeyDown={handleTrackKey}
              className="group relative h-3.5 cursor-pointer touch-none overflow-hidden rounded-pill bg-hl/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus"
            >
              {(bands ?? []).map((band) => (
                <span
                  key={band.index}
                  aria-hidden
                  className={`absolute h-[3px] rounded-pill ${band.lane ? 'top-[8px]' : 'top-[3px]'} ${band.index === lineIndex ? 'bg-foam' : 'bg-faint'}`}
                  style={{ left: `${(band.from / total) * 100}%`, width: `${Math.max(0.15, ((band.to - band.from) / total) * 100)}%` }}
                />
              ))}
              <span
                className="absolute inset-y-0 min-w-2 rounded-pill bg-foreground/15 inset-ring inset-ring-foreground/40 transition-colors group-hover:bg-foreground/25"
                style={{ width: `${Math.min(100, (view.span / total) * 100)}%`, left: `${(view.from / total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer: shortcuts on the left; snapping, syllables, zoom and the line's own controls on the right. */}
      <div className="flex shrink-0 items-center gap-x-4 border-t border-hl/60 px-3 py-1.5 text-xs text-subtle">
        <div className="flex min-w-0 flex-1 items-center gap-x-3.5 overflow-hidden whitespace-nowrap">
          {hints}
          {tooShortCount > 0 && (
            <span className="inline-flex items-center gap-1 text-gold">
              <Icon name="warning" size={14} />
              {t('editor.words.warnings', { count: tooShortCount })}
            </span>
          )}
        </div>
        <div data-tour="words-view-tools" className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <Tip content={t('editor.words.syllablesTip')}>
            <label className="inline-flex items-center gap-1.5 text-foreground/80">
              <input
                type="checkbox"
                checked={showSyllables}
                onChange={(e) => setShowSyllables(e.target.checked)}
                className="size-4 accent-[var(--foam)]"
              />
              {t('editor.words.syllables')}
            </label>
          </Tip>
          <span aria-hidden className="h-4 w-px bg-hl" />
          <div role="radiogroup" aria-label={t('editor.words.snap')} className="flex items-center gap-0.5 rounded-md p-0.5 inset-ring inset-ring-hl">
            <span className="px-1.5 text-foreground/65">{t('editor.words.snap')}</span>
            {(['off', 'playhead', 'edges', 'grid'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={snap === mode}
                onClick={() => setSnap(mode)}
                className={`h-6 rounded px-2 font-medium focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus ${snap === mode ? 'bg-foam/20 text-foreground' : 'text-subtle hover:text-foreground'}`}
              >
                {t(`editor.words.snap${mode === 'off' ? 'Off' : mode === 'playhead' ? 'Playhead' : mode === 'edges' ? 'Edges' : 'Grid'}`)}
              </button>
            ))}
          </div>
          <span aria-hidden className="h-4 w-px bg-hl" />
          <button type="button" aria-label={t('editor.words.zoomOut')} disabled={view.span >= maxSpan - 1e-6} onClick={() => changeZoom(-1)} className={toolButton}>
            <Icon name="zoom_out" size={16} />
          </button>
          <Tip content={t('editor.words.zoomFit')}>
            <button type="button" aria-label={t('editor.words.zoomFit')} onClick={fitLine} className={`${toolButton} w-12 font-mono tabular-nums text-foreground/80`}>
              {zoomPct}%
            </button>
          </Tip>
          <button type="button" aria-label={t('editor.words.zoomIn')} disabled={view.span <= MIN_SPAN + 1e-6} onClick={() => changeZoom(1)} className={toolButton}>
            <Icon name="zoom_in" size={16} />
          </button>
          {footerEnd}
        </div>
      </div>
    </section>
  );
}
