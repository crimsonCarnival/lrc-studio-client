import { EmptyState } from '@ui/EmptyState';
import { Kbd } from '@ui/kbd';
import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react';
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
import { MIN_WORD_GAP, TOO_SHORT, layoutWords, snapTime, splitMorae, wordKana } from '@/features/editor/utils/word-timing';
import type { SnapMode } from '@/features/editor/utils/word-timing';

const CAPTION = 'text-xs font-bold uppercase tracking-[0.08em] text-foreground/65';
/** Spacing of the ruler ticks (seconds). */
const RULER_TICK = 0.1;
/** Zoom steps of the time axis: 1 shows the whole line. */
const ZOOMS = [1, 1.5, 2, 3, 4, 6, 8];
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
    const out: { index: number; id?: string; text: string; words?: EditorWord[]; timed: number; total: number; tooShort: number }[] = [];
    lines.forEach((line, index) => {
      if (line.type === 'section' || !line.text?.trim()) return;
      const total = line.words?.length || line.text.trim().split(/\s+/).length;
      const timed = line.words?.filter((w) => w.time != null).length ?? 0;
      // Words are only drawn one by one when there is a reading to show; otherwise the text keeps its own spacing.
      const words = line.words?.some((w) => w.reading) ? line.words : undefined;
      out.push({ index, id: line.id, text: line.text, words, timed, total, tooShort: countTooShort(line.words) });
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

interface WordTimelineProps {
  line: EditorLine;
  /** Where the line stops: its end time, the next timed line, or the track's end. */
  lineEnd: number | null;
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

/**
 * The focused line as one row per word: the word itself (with its furigana, start time and
 * menu) on the left, and on the right a block as long as the word lasts. Dragging a block's left
 * edge moves where the word starts; its right edge moves where it stops, leaving a pause before
 * the next word. Words with no time yet share what is left of the line evenly and cannot be dragged.
 */
export function WordTimeline({
  line, lineEnd, playbackPosition, isPlaying, activeWordIndex, selectedWordIndex, playingWordIndex,
  onSetWordTime, onSetWordEnd, onSelectWord, onEditLine, markKey, onPlayFrom, wordMenu, footerEnd, hints,
}: WordTimelineProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const format = settings.editor?.display?.readingFormat;
  const trackRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  // The scrollbar track under the rows when zoomed in.
  const hScrollRef = useRef<HTMLDivElement>(null);
  // Dragging the ruler pans the view: where the drag started and the view at that moment.
  const panRef = useRef<{ x: number; scroll: number } | null>(null);
  // Which edge is being dragged. The time is written to the line on every move; the undo history
  // groups changes that arrive in quick succession, so a drag is still one step back.
  const [drag, setDrag] = useState<{ index: number; edge: 'start' | 'end' } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [scroll, setScroll] = useState(0);
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

  const segments = useMemo(
    () => (start == null || end == null ? [] : layoutWords(words, start, end)),
    [words, start, end],
  );

  // The waveform under the line, normalised to its own loudest moment.
  const wave = useMemo(() => {
    void peaksVersion;
    const cached = getCachedPeaks();
    const channel = cached?.peaks[0];
    if (!cached || !channel?.length || !cached.duration || start == null || span == null) return null;
    const out: number[] = [];
    let max = 0;
    for (let b = 0; b < WAVE_BINS; b++) {
      const from = Math.floor(((start + (span * b) / WAVE_BINS) / cached.duration) * channel.length);
      const to = Math.max(from + 1, Math.ceil(((start + (span * (b + 1)) / WAVE_BINS) / cached.duration) * channel.length));
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
  }, [peaksVersion, start, span]);

  // Zoomed in, the axis follows the playhead while the line plays: once the playhead nears the
  // edge of the view, the view jumps so it sits a fifth of the way in. Adjusted during render
  // (React's pattern for state that follows a prop), not in an effect, so it never draws a frame behind.
  if (isPlaying && zoom > 1 && start != null && span != null) {
    const p = (playbackPosition - start) / span;
    const viewFrom = (scroll * (zoom - 1)) / zoom;
    const viewTo = viewFrom + 1 / zoom;
    if (p >= 0 && p <= 1 && (p < viewFrom || p > viewTo - 0.05 / zoom)) {
      const target = Math.min(1, Math.max(0, ((p - 0.2 / zoom) * zoom) / (zoom - 1)));
      if (Math.abs(target - scroll) > 1e-6) setScroll(target);
    }
  }

  if (start == null || span == null || end == null || words.length === 0) {
    return (
      <EmptyState
        art="words"
        words={words.map((w) => w.word ?? '').filter(Boolean)}
        title={t('editor.words.emptyTitle')}
        description={<Trans i18nKey="editor.words.emptyDesc" values={{ key: markKey }} components={[<Kbd key="0" />]} />}
      />
    );
  }

  const pct = (time: number) => ((time - start) / span) * 100;
  // Every track (header, rows, overlay) is this same wide strip, slid by the scroll position.
  const stripStyle = { width: `${zoom * 100}%`, transform: `translateX(${zoom === 1 ? 0 : (-(zoom - 1) / zoom) * scroll * 100}%)` };

  const timeAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return start;
    return start + Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * span;
  };
  const snapReach = () => {
    const width = trackRef.current?.getBoundingClientRect().width ?? 0;
    return width ? (SNAP_PX / width) * span : 0;
  };
  // A word stays after the timed word before it (and its end) and before the one after it;
  // the first and last are held by the line's own start and end instead.
  const clampStart = (index: number, time: number) => {
    const before = words.slice(0, index).reverse().find((w) => w.time != null)?.time;
    const after = words.slice(index + 1).find((w) => w.time != null)?.time;
    const min = before != null ? Math.max(start, before + MIN_WORD_GAP) : start;
    const ownEnd = segments[index]?.hasEnd ? segments[index].to : Infinity;
    const max = Math.min(end, after ?? Infinity, ownEnd) - MIN_WORD_GAP;
    return Math.max(min, Math.min(Math.max(min, max), time));
  };
  const edgesExcept = (index: number) => segments.flatMap((s, k) => (k === index || !s.timed ? [] : [s.from, s.to])).concat(start, end);

  const handlePointerDown = (index: number, edge: 'start' | 'end') => (e: PointerEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ index, edge });
  };
  const handlePointerMove = (index: number, edge: 'start' | 'end') => (e: PointerEvent<HTMLSpanElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const raw = snapTime(timeAt(e.clientX), snap, snapReach(), playbackPosition, edgesExcept(index));
    if (edge === 'start') {
      const time = Number(clampStart(index, raw).toFixed(3));
      if (time !== words[index].time) onSetWordTime(index, time);
    } else {
      const seg = segments[index];
      const min = seg.from + MIN_WORD_GAP;
      // Pulled back up to the next word, the end goes away: the word runs into it again.
      if (raw >= seg.gapTo - 0.005) {
        if (words[index].end != null) onSetWordEnd(index, null);
        return;
      }
      const time = Number(Math.max(min, raw).toFixed(3));
      if (time !== words[index].end) onSetWordEnd(index, time);
    }
  };
  const handlePointerUp = () => setDrag(null);
  const nudgeStart = (index: number, delta: number) => {
    const time = words[index].time;
    if (time != null) onSetWordTime(index, Number(clampStart(index, time + delta).toFixed(3)));
  };
  const nudgeEnd = (index: number, delta: number) => {
    const seg = segments[index];
    const next = Number((seg.to + delta).toFixed(3));
    if (next >= seg.gapTo - 0.005) onSetWordEnd(index, null);
    else onSetWordEnd(index, Math.max(seg.from + MIN_WORD_GAP, next));
  };
  const edgeKeys = (index: number, edge: 'start' | 'end') => (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.01 : 0.05;
    const delta = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    if (!delta) return;
    e.preventDefault();
    e.stopPropagation();
    if (edge === 'start') nudgeStart(index, delta); else nudgeEnd(index, delta);
  };

  // How far (0–1 of the scroll range) a horizontal move of `px` pixels takes the view.
  const scrollPerPx = () => {
    const width = trackRef.current?.getBoundingClientRect().width ?? 0;
    return width > 0 && zoom > 1 ? 1 / (width - width / zoom) : 0;
  };
  const panBy = (px: number) => setScroll((s) => Math.min(1, Math.max(0, s + px * scrollPerPx())));
  // Over the rows a sideways wheel (or Shift+wheel) pans; over the ruler, which has nothing to
  // scroll up or down, any wheel does.
  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (zoom === 1) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (delta) panBy(delta);
  };
  const handleRulerWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (zoom === 1) return;
    panBy(Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY);
  };
  const handleRulerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (zoom === 1 || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    panRef.current = { x: e.clientX, scroll };
  };
  const handleRulerMove = (e: PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - pan.x;
    setScroll(Math.min(1, Math.max(0, pan.scroll - dx * scrollPerPx())));
  };
  const handleRulerUp = () => { panRef.current = null; };
  // The scrollbar: always drawn (overlay scrollbars hide until used, which reads as "stuck").
  // Pressing the track centres the thumb there; dragging it pans; arrows and Home/End step.
  const scrollFromTrack = (clientX: number) => {
    const rect = hScrollRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const thumb = rect.width / zoom;
    setScroll(Math.min(1, Math.max(0, (clientX - rect.left - thumb / 2) / (rect.width - thumb))));
  };
  const handleTrackDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    scrollFromTrack(e.clientX);
  };
  const handleTrackMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) scrollFromTrack(e.clientX);
  };
  const handleTrackKey = (e: KeyboardEvent) => {
    const page = 1 / (zoom - 1);
    const next = e.key === 'ArrowLeft' ? scroll - page / 4 : e.key === 'ArrowRight' ? scroll + page / 4
      : e.key === 'PageUp' ? scroll - page : e.key === 'PageDown' ? scroll + page
        : e.key === 'Home' ? 0 : e.key === 'End' ? 1 : null;
    if (next == null) return;
    e.preventDefault();
    e.stopPropagation();
    setScroll(Math.min(1, Math.max(0, next)));
  };
  const changeZoom = (dir: 1 | -1) => {
    const k = ZOOMS.indexOf(zoom) + dir;
    if (k < 0 || k >= ZOOMS.length) return;
    const next = ZOOMS[k];
    setZoom(next);
    // Zooming in centres on the playhead when it is in the line, else on the picked word.
    const focusTime = playbackPosition >= start && playbackPosition <= end
      ? playbackPosition
      : segments[selectedWordIndex ?? Math.max(0, activeWordIndex)]?.from ?? start;
    const p = (focusTime - start) / span;
    setScroll(next === 1 ? 0 : Math.min(1, Math.max(0, (p - 0.5 / next) * next / (next - 1))));
  };

  const playhead = (playbackPosition - start) / span;
  // Ruler ticks sit on absolute song time (multiples of the step), so two lines line up the same way.
  const visibleSpan = span / zoom;
  const tickStep = visibleSpan <= 20 ? RULER_TICK : 0.5;
  const labelStep = visibleSpan <= 4 ? 0.25 : visibleSpan <= 8 ? 0.5 : visibleSpan <= 20 ? 1 : 5;
  const ticks: { pct: number; label: string | null }[] = [];
  for (let k = Math.ceil(start / tickStep - 1e-9); k * tickStep <= end + 1e-9; k++) {
    const time = Math.round(k * tickStep * 1000) / 1000;
    const rem = time / labelStep;
    ticks.push({ pct: pct(time), label: Math.abs(rem - Math.round(rem)) < 1e-6 ? time.toFixed(labelStep < 0.5 ? 2 : 1) : null });
  }
  const boundaries = [...segments.filter((s) => s.timed).map((s) => s.from), end];
  const tooShortCount = segments.filter((s) => s.timed && s.to - s.from < TOO_SHORT).length;
  // Long lines get shorter rows and smaller type so the whole line still fits on screen.
  const compact = words.length > 9;

  const toolButton = 'grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-subtle hover:bg-overlay hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus disabled:opacity-40 disabled:hover:bg-transparent';

  return (
    <section
      aria-label={t('editor.words.timelineLabel')}
      // The label column is narrower on small screens; the track overlay reads the same variable.
      className="[--label-w:150px] lg:[--label-w:240px] flex min-h-0 flex-1 flex-col rounded-[var(--radius-card)] bg-card inset-ring inset-ring-hl"
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Header: the 100 ms ruler with the playhead's time. */}
        <div className="flex h-9 shrink-0 border-b border-hl/60">
          <div className="flex w-[var(--label-w)] shrink-0 items-center justify-between border-r border-hl/60 px-3">
            <span className={CAPTION}>{t('editor.words.colWord')}</span>
            <span className={CAPTION}>{t('editor.inspector.start')}</span>
          </div>
          <div
            className={`relative min-w-0 flex-1 overflow-hidden ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onWheel={handleRulerWheel}
            onPointerDown={handleRulerDown}
            onPointerMove={handleRulerMove}
            onPointerUp={handleRulerUp}
            onPointerCancel={handleRulerUp}
          >
            <div ref={trackRef} className="relative h-full touch-none select-none" style={stripStyle}>
              <div aria-hidden className="absolute inset-0 font-mono text-[10px] text-subtle">
                {ticks.map((tick, k) => (
                  <span key={k} className="absolute bottom-0" style={{ left: `${tick.pct}%` }}>
                    <span className={`absolute bottom-0 w-px -translate-x-1/2 ${tick.label ? 'h-[9px] bg-subtle' : 'h-1 bg-faint'}`} />
                    {tick.label && <span className="absolute bottom-2.5 -translate-x-1/2 tabular-nums">{tick.label}</span>}
                  </span>
                ))}
              </div>
              {playhead >= 0 && playhead <= 1 && (
                <span className="absolute top-1 z-10 -translate-x-1/2 rounded-md bg-foam px-[7px] py-[3px] font-mono text-[11px] leading-none font-semibold tabular-nums text-background" style={{ left: `${playhead * 100}%` }}>
                  {formatTime(playbackPosition)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* One row per word, sharing the height the editor has. Rows shrink for long lines and only
            scroll once even the smallest rows no longer fit. */}
        <div className="lrc-scroll relative flex min-h-0 flex-1 flex-col overflow-y-auto">
          {/* Waveform, guides and playhead cross every row; they ignore the pointer so the edges stay draggable. */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[var(--label-w)] right-0 overflow-hidden">
            <div className="relative h-full" style={stripStyle}>
              {wave && (
                <svg viewBox={`0 0 ${WAVE_BINS} 100`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-foreground/[0.07]">
                  <path d={wave} fill="currentColor" />
                </svg>
              )}
              {boundaries.map((time, k) => (
                <span key={k} className="absolute inset-y-0 border-l border-dashed border-faint/50" style={{ left: `${pct(time)}%` }} />
              ))}
              {playhead >= 0 && playhead <= 1 && (
                <span className="absolute inset-y-0 z-20 w-0.5 -translate-x-1/2 rounded-pill bg-foam shadow-[0_0_8px_var(--foam)]" style={{ left: `${playhead * 100}%` }} />
              )}
            </div>
          </div>

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
            return (
              <ContextMenu key={i}>
            const playable = seg.timed && !!onPlayFrom;
            const BlockTag = playable ? 'button' : 'span';
                <ContextMenuTrigger asChild>
                  <div
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
                      <div className="relative h-full" style={stripStyle}>
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
                                <span className="pointer-events-none absolute top-0 left-2 rounded-md bg-foam px-[7px] py-[3px] font-mono text-[11px] leading-none font-semibold tabular-nums whitespace-nowrap text-background">
                                  {formatTime(seg.from)}
                                </span>
                              )}
                            </span>
                            <span
                              role="slider"
                              tabIndex={0}
                              aria-label={t('editor.words.endLabel', { word: seg.word })}
                              aria-valuemin={Number(seg.from.toFixed(2))}
                              aria-valuemax={Number(seg.gapTo.toFixed(2))}
                              aria-valuenow={Number(seg.to.toFixed(2))}
                              onPointerDown={handlePointerDown(i, 'end')}
                              onPointerMove={handlePointerMove(i, 'end')}
                              onPointerUp={handlePointerUp}
                              onPointerCancel={handlePointerUp}
                              onKeyDown={edgeKeys(i, 'end')}
                              className="group absolute inset-y-0 z-10 grid w-2.5 -translate-x-1/2 cursor-ew-resize touch-none place-items-center focus-visible:outline-none coarse:w-8"
                              style={{ left: `${pct(seg.to)}%` }}
                            >
                              <span className={`h-1/2 w-[3px] rounded-pill transition-colors group-hover:bg-foreground group-focus-visible:bg-foreground ${drag?.index === i && drag.edge === 'end' ? 'bg-foreground' : seg.hasEnd ? 'bg-foam/80' : 'bg-transparent'}`} />
                              {drag?.index === i && drag.edge === 'end' && (
                                <span className="pointer-events-none absolute top-0 right-2 rounded-md bg-foam px-[7px] py-[3px] font-mono text-[11px] leading-none font-semibold tabular-nums whitespace-nowrap text-background">
                                  {formatTime(seg.to)}
                                </span>
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-72">{wordMenu(i)}</ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>

        {/* Zoomed in, a scrollbar under the rows: the view can always be dragged back. */}
        {zoom > 1 && (
          <div className="flex h-5 shrink-0 items-center border-t border-hl/40">
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
                aria-valuenow={Math.round(scroll * 100)}
                onPointerDown={handleTrackDown}
                onPointerMove={handleTrackMove}
                onKeyDown={handleTrackKey}
                className="group relative h-2.5 cursor-pointer touch-none rounded-pill bg-hl/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus"
              >
                <span
                  className="absolute inset-y-0 rounded-pill bg-faint transition-colors group-hover:bg-subtle"
                  style={{ width: `${100 / zoom}%`, left: `${scroll * (100 - 100 / zoom)}%` }}
                />
              </div>
            </div>
          </div>
        )}
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
        <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
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
          <button type="button" aria-label={t('editor.words.zoomOut')} disabled={zoom === ZOOMS[0]} onClick={() => changeZoom(-1)} className={toolButton}>
            <Icon name="zoom_out" size={16} />
          </button>
          <span className="w-10 text-center font-mono tabular-nums text-foreground/80">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label={t('editor.words.zoomIn')} disabled={zoom === ZOOMS[ZOOMS.length - 1]} onClick={() => changeZoom(1)} className={toolButton}>
            <Icon name="zoom_in" size={16} />
          </button>
          {footerEnd}
        </div>
      </div>
    </section>
  );
}
