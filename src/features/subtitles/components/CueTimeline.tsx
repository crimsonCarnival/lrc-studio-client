import { memo, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { Icon } from '@/shared/ui/Icon';
import { usePlayer } from '@/features/player/PlayerContext';
import { constrainCueEdit } from '../subtitle-cues';
import { formatClock } from '../subtitle-clock';
import { CueMenu, type CueActions } from './CueMenu';
import type { Cue } from '../subtitles.types';

type CueTimelineProps = {
  cues: Cue[];
  duration: number;
  /** `lineIndex` of the selected cue. */
  selectedLine: number | null;
  /** `lineIndex` of every cue with at least one problem. */
  issueLines: Set<number>;
  onSelect: (lineIndex: number) => void;
  onSeek: (time: number) => void;
  onCommit: (cueIndex: number, times: { start: number; end: number }) => void;
  actions: CueActions;
};

type Drag = {
  index: number;
  mode: 'move' | 'start' | 'end';
  x0: number;
  start0: number;
  end0: number;
  start: number;
  end: number;
  moved: boolean;
};

const MIN_PPS = 8;
const MAX_PPS = 240;
// Seconds between ruler labels; the first that leaves at least LABEL_GAP px is used.
const TICK_STEPS = [1, 2, 5, 10, 30, 60, 120, 300, 600];
const LABEL_GAP = 72;
// A press that travels less than this is a click (select and seek), not a drag.
const DRAG_THRESHOLD = 3;

/** Its own component so only this line re-renders on every playback tick. */
function Playhead({ pps, scrollRef }: { pps: number; scrollRef: RefObject<HTMLDivElement | null> }) {
  const { currentTime, isPlaying } = usePlayer();
  const x = currentTime * pps;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isPlaying) return;
    if (x < el.scrollLeft || x > el.scrollLeft + el.clientWidth - 48) el.scrollLeft = Math.max(0, x - 96);
  }, [x, isPlaying, scrollRef]);
  return <div className="absolute inset-y-0 left-0 w-px bg-primary pointer-events-none" style={{ transform: `translateX(${x}px)` }} />;
}

export const CueTimeline = memo(function CueTimeline({ cues, duration, selectedLine, issueLines, onSelect, onSeek, onCommit, actions }: CueTimelineProps) {
  const { t } = useTranslation();
  const [pps, setPps] = useState(40);
  // The cue being dragged is drawn from this draft and written back once, on release,
  // so one drag is one undo step and one save.
  const [drag, setDrag] = useState<Drag | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // The track is exactly the media's length; until that is known, room for what is there.
  const lastEnd = cues.reduce((max, c) => Math.max(max, c.end), 0);
  const total = duration > 0 ? duration : Math.max(lastEnd + 2, 10);
  const step = TICK_STEPS.find((s) => s * pps >= LABEL_GAP) ?? TICK_STEPS[TICK_STEPS.length - 1];
  const ticks = Array.from({ length: Math.floor(total / step) + 1 }, (_, i) => i * step);

  const startDrag = (e: ReactPointerEvent<HTMLElement>, index: number, mode: Drag['mode']) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const c = cues[index];
    setDrag({ index, mode, x0: e.clientX, start0: c.start, end0: c.end, start: c.start, end: c.end, moved: false });
  };

  const moveDrag = (e: ReactPointerEvent<HTMLElement>) => {
    if (!drag) return;
    const dx = e.clientX - drag.x0;
    if (!drag.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    const d = dx / pps;
    const edit = drag.mode === 'move'
      ? { start: drag.start0 + d, end: drag.end0 + d }
      : drag.mode === 'start' ? { start: drag.start0 + d } : { end: drag.end0 + d };
    setDrag({ ...drag, ...constrainCueEdit(cues, drag.index, edit, duration || undefined), moved: true });
  };

  const endDrag = () => {
    if (!drag) return;
    const cue = cues[drag.index];
    if (drag.moved) onCommit(drag.index, { start: drag.start, end: drag.end });
    else onSeek(cue.start);
    onSelect(cue.lineIndex);
    setDrag(null);
  };

  const zoom = (factor: number) => setPps((p) => Math.min(MAX_PPS, Math.max(MIN_PPS, p * factor)));

  return (
    <div className="flex flex-col border-t border-zinc-800 bg-zinc-950/40">
      <div className="flex items-center justify-between gap-2 px-4 pt-2">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/65">{t('editor.studio.timeline')}</span>
        <span className="text-xs text-foreground/65 max-xl:hidden">{t('editor.studio.timelineHint')}</span>
        <span className="flex items-center gap-1">
          <Tip content={t('editor.studio.zoomOut')}>
            <Button variant="ghost" size="icon" className="size-8" aria-label={t('editor.studio.zoomOut')} disabled={pps <= MIN_PPS} onClick={() => zoom(1 / 1.5)}>
              <Icon name="zoom_out" size={16} />
            </Button>
          </Tip>
          <Tip content={t('editor.studio.zoomIn')}>
            <Button variant="ghost" size="icon" className="size-8" aria-label={t('editor.studio.zoomIn')} disabled={pps >= MAX_PPS} onClick={() => zoom(1.5)}>
              <Icon name="zoom_in" size={16} />
            </Button>
          </Tip>
        </span>
      </div>

      <div ref={scrollRef} className="lrc-scroll overflow-x-auto overflow-y-hidden px-4 pb-3">
        {/* Clicking the ruler or an empty stretch of track seeks there. */}
        <div
          className="relative h-[92px] cursor-pointer select-none"
          style={{ width: total * pps }}
          onClick={(e) => onSeek(Math.max(0, (e.clientX - e.currentTarget.getBoundingClientRect().left) / pps))}
        >
          {ticks.map((tick) => (
            <div key={tick} className="absolute top-0 h-full border-l border-zinc-800/70" style={{ left: tick * pps }}>
              <span className="pl-1 text-[10px] font-mono tabular-nums text-foreground/45">{formatClock(tick).slice(0, -4)}</span>
            </div>
          ))}

          {cues.map((cue, i) => {
            const live = drag?.index === i ? drag : cue;
            const selected = cue.lineIndex === selectedLine;
            const hasIssue = issueLines.has(cue.lineIndex);
            return (
              <CueMenu key={cue.lineIndex} cue={cue} index={i} hasNext={i < cues.length - 1} actions={actions}>
              <div
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`${formatClock(live.start)} – ${formatClock(live.end)}: ${cue.text}`}
                className={`absolute top-6 h-14 overflow-hidden rounded-md border text-left cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                  selected ? 'border-primary bg-primary/25' : hasIssue ? 'border-warning/60 bg-warning/15' : 'border-zinc-700 bg-zinc-800/80 hover:border-zinc-600'
                }`}
                style={{ left: live.start * pps, width: Math.max(4, (live.end - live.start) * pps) }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(cue.lineIndex);
                    onSeek(cue.start);
                  }
                }}
                onPointerDown={(e) => startDrag(e, i, 'move')}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={() => setDrag(null)}
              >
                <span className="block px-2 pt-1 text-[11px] leading-tight text-foreground line-clamp-2 pointer-events-none">{cue.text}</span>
                <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize bg-foreground/25 hover:bg-primary" onPointerDown={(e) => startDrag(e, i, 'start')} />
                <span aria-hidden className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize bg-foreground/25 hover:bg-primary" onPointerDown={(e) => startDrag(e, i, 'end')} />
              </div>
              </CueMenu>
            );
          })}

          {drag?.moved && (
            <span
              className="absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-primary px-1.5 py-px font-mono text-[11px] text-zinc-950 pointer-events-none"
              style={{ left: ((drag.start + drag.end) / 2) * pps }}
            >
              {formatClock(drag.start)} → {formatClock(drag.end)}
            </span>
          )}

          <Playhead pps={pps} scrollRef={scrollRef} />
        </div>
      </div>
    </div>
  );
});
