import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { Kbd } from '@ui/kbd';
import { Tip } from '@ui/tip';
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover';
import { formatTime } from '@/shared/utils/format-time';
import type { EditorLine } from '@/features/editor/editor.types';
import { counterpartWindow, frequentCounterparts, isPendingCounterpart, listCounterparts } from '@/features/editor/services/counterparts';
import { counterpartLabel } from './counterpart-label';

// Offered when a song has no counterparts of its own yet. They are lyrics, not UI text, so they
// are the same in every language.
const COMMON_COUNTERPARTS = ['yeah', 'ayy', 'uh', 'skrrt', 'woo', 'huh'];
const NUDGE = 0.1;
const CAPTION = 'font-mono text-[11px] font-semibold uppercase tracking-[0.12em]';
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus';

interface CounterpartStripProps {
  lines: EditorLine[];
  playbackPosition: number;
  /** The capture shortcut as a key-cap label. */
  captureKey: string;
  /** Id of the selected counterpart line, if any. */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Id of the counterpart whose text is being asked for. */
  namingId: string | null;
  onNaming: (id: string | null) => void;
  onCapture: () => void;
  onMove: (index: number, time: number) => void;
  onName: (index: number, text: string) => void;
  onDelete: (index: number) => void;
  onSeek: (time: number) => void;
  onClose: () => void;
}

interface Block { key: string; label: string; from: number; to: number }

/** The lyrics inside the window as blocks: one per timed word, or one per line without them. */
function lyricBlocks(lines: EditorLine[], start: number, end: number): Block[] {
  const main = lines.filter((l) => l.type !== 'section' && l.adLibOf == null && l.timestamp != null);
  const blocks: Block[] = [];
  main.forEach((line, i) => {
    const from = line.timestamp!;
    const to = main[i + 1]?.timestamp ?? end;
    if (to <= start || from >= end) return;
    const words = (line.words ?? []).filter((w) => w.time != null && w.word);
    if (words.length > 1) {
      words.forEach((w, j) => blocks.push({ key: `${line.id ?? i}-${j}`, label: w.word!, from: w.time!, to: words[j + 1]?.time ?? to }));
    } else {
      blocks.push({ key: String(line.id ?? i), label: line.text ?? '', from, to });
    }
  });
  return blocks;
}

/** Asks for the text of a counterpart: type it, or take one the song already uses. */
function NameForm({ time, initial, frequents, onSave, onLater }: {
  time: number; initial: string; frequents: string[]; onSave: (text: string) => void; onLater: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initial);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">
          <Trans i18nKey="editor.counterpart.nameTitle" values={{ time: formatTime(time) }} components={[<span key="0" className="font-mono text-counterpart-ink" />]} />
        </span>
        <span className="font-mono text-[11px] font-medium text-subtle">{t('editor.counterpart.nameHint')}</span>
      </div>
      <input
        autoFocus
        type="text"
        autoComplete="off"
        aria-label={t('editor.counterpart.nameLabel')}
        placeholder={t('editor.counterpart.namePlaceholder')}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); onSave(draft.trim()); }
          if (e.key === 'Escape') { e.preventDefault(); onLater(); }
          // Typing here must never reach the editor's own shortcuts.
          e.stopPropagation();
        }}
        className="h-10 rounded-[10px] border-0 bg-card px-3 text-base font-medium italic text-foreground outline-none inset-ring-2 inset-ring-counterpart placeholder:text-faint"
      />
      <div className="flex flex-col gap-1.5">
        <span className={`${CAPTION} text-subtle`}>{t('editor.counterpart.frequents')}</span>
        <div className="flex flex-wrap gap-1.5">
          {frequents.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => onSave(text)}
              className={`h-[30px] coarse:h-11 rounded-full bg-raised px-2.5 text-sm font-medium italic text-foreground inset-ring inset-ring-hl transition-colors duration-[var(--duration-state)] hover:bg-counterpart-soft hover:text-counterpart-ink hover:inset-ring-counterpart ${FOCUS}`}
            >
              {text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Live counterpart capture (redesign sheet 20): hear it, tap it, name it later. A zoomed stretch
 * of the song with the lyrics on one lane and the counterparts on their own, where each one can
 * be selected, renamed, nudged or dragged.
 */
export function CounterpartStrip({
  lines, playbackPosition, captureKey, selectedId, onSelect, namingId, onNaming,
  onCapture, onMove, onName, onDelete, onSeek, onClose,
}: CounterpartStripProps) {
  const { t } = useTranslation();
  const laneRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragWindow, setDragWindow] = useState<{ start: number; end: number } | null>(null);

  const counterparts = useMemo(() => listCounterparts(lines), [lines]);
  const frequents = useMemo(() => frequentCounterparts(lines, COMMON_COUNTERPARTS), [lines]);
  const pendingCount = useMemo(() => counterparts.filter((a) => isPendingCounterpart(a.line)).length, [counterparts]);

  // The window follows playback line by line. While a counterpart is being named or dragged it
  // stays put, so the pill does not slide away from under the popover or the pointer.
  const naming = namingId ? counterparts.find((a) => a.line.id === namingId) : undefined;
  const { start, end } = dragWindow ?? counterpartWindow(lines, naming ? naming.time : playbackPosition);
  const span = end - start;
  const pct = (time: number) => `${Math.max(0, Math.min(100, ((time - start) / span) * 100))}%`;

  const blocks = useMemo(() => lyricBlocks(lines, start, end), [lines, start, end]);
  const visible = counterparts.filter((a) => a.time >= start && a.time <= end);

  // A selection that no longer exists (deleted, undone) is dropped.
  useEffect(() => {
    if (selectedId && !counterparts.some((a) => a.line.id === selectedId)) onSelect(null);
    if (namingId && !counterparts.some((a) => a.line.id === namingId)) onNaming(null);
  }, [counterparts, selectedId, namingId, onSelect, onNaming]);

  const timeAt = (clientX: number) => {
    const rect = laneRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return start;
    return start + ((clientX - rect.left) / rect.width) * span;
  };

  const endDrag = () => { setDragId(null); setDragWindow(null); };

  const onPillKey = (e: KeyboardEvent, index: number, time: number, id: string) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      onMove(index, time + (e.key === 'ArrowLeft' ? -NUDGE : NUDGE));
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      onDelete(index);
    } else if (e.key === 'Enter') {
      onNaming(id);
    } else if (e.key === 'Escape') {
      onSelect(null);
    } else {
      return;
    }
    // These keys act on the counterpart, not on the player or the line list behind it.
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <section
      aria-label={t('editor.counterpart.lane')}
      className="mx-3 mb-3 flex flex-col gap-3 rounded-[var(--radius-card)] bg-background px-5 pb-5 pt-4 inset-ring inset-ring-hl sm:mx-4"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className={`${CAPTION} text-counterpart-ink`}>{t('editor.counterpart.lane')}</span>
        {counterparts.length === 0 ? (
          <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-foreground">
            {(['step1', 'step2', 'step3'] as const).map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-counterpart-soft font-mono text-xs font-semibold text-counterpart-ink">{i + 1}</span>
                <span>
                  {step === 'step1'
                    ? <Trans i18nKey="editor.counterpart.step1" values={{ key: captureKey }} components={[<Kbd key="0" />]} />
                    : t(`editor.counterpart.${step}`)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <span className="min-w-0 flex-1 truncate text-[13px] text-subtle">
            {selectedId ? t('editor.counterpart.selectedHint') : pendingCount > 0 ? t('editor.counterpart.pendingCount', { count: pendingCount }) : ''}
          </span>
        )}
        <button
          type="button"
          onClick={onCapture}
          className={`inline-flex h-11 items-center gap-2 rounded-[14px] bg-counterpart px-4 text-[15px] font-bold text-primary-foreground transition-transform duration-100 ease-out active:scale-[.96] ${FOCUS}`}
        >
          <Icon name="mic" size={18} />
          {t('editor.counterpart.capture')}
          <kbd className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-md bg-black/15 px-1.5 font-mono text-[11px] font-semibold uppercase">{captureKey}</kbd>
        </button>
        <Tip content={t('editor.counterpart.close')}>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('editor.counterpart.close')} className="size-9 lg:size-9 coarse:size-11">
            <Icon name="close" size={16} />
          </Button>
        </Tip>
      </div>

      <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-3">
        <div className="flex flex-col gap-2">
          <span className={`${CAPTION} flex h-10 items-center text-subtle`}>{t('editor.counterpart.lyricsLane')}</span>
          <span className={`${CAPTION} flex h-10 items-center text-counterpart-ink`}>{t('editor.counterpart.lane')}</span>
        </div>
        <div className="relative flex min-w-0 flex-col gap-2">
        <div className="relative h-10 overflow-hidden rounded-[10px] bg-card">
          {blocks.map((b) => {
            const left = ((Math.max(b.from, start) - start) / span) * 100;
            const width = ((Math.min(b.to, end) - Math.max(b.from, start)) / span) * 100;
            if (width <= 0) return null;
            const lit = playbackPosition >= b.from;
            return (
              <button
                key={b.key}
                type="button"
                tabIndex={-1}
                onClick={() => onSeek(b.from)}
                style={{ left: `${left}%`, width: `calc(${width}% - 3px)` }}
                className={`absolute top-1 flex h-8 min-w-1.5 items-center overflow-hidden whitespace-nowrap rounded-[7px] pl-2 text-left text-[13px] font-semibold inset-ring ${lit ? 'bg-primary-soft text-primary-ink inset-ring-iris' : 'bg-raised text-foreground inset-ring-hl'}`}
              >
                {b.label}
              </button>
            );
          })}
        </div>

        <div ref={laneRef} className="relative h-10 rounded-[10px] bg-counterpart-soft">
          {visible.map(({ index, line, time }) => {
            const id = line.id ?? `i-${index}`;
            const pending = isPendingCounterpart(line);
            const selected = id === selectedId;
            const label = pending
              ? t('editor.counterpart.pendingAria', { time: formatTime(time) })
              : t('editor.counterpart.namedAria', { text: line.text, time: formatTime(time) });
            return (
              <Popover key={id} open={namingId === id} onOpenChange={(open) => { if (!open && namingId === id) onNaming(null); }}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={label}
                    aria-pressed={selected}
                    data-pending={pending || undefined}
                    style={{ left: pct(time) }}
                    onClick={() => { onSelect(id); if (pending) onNaming(id); }}
                    onDoubleClick={() => onNaming(id)}
                    onKeyDown={(e) => onPillKey(e, index, time, id)}
                    onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
                      if (e.button !== 0) return;
                      e.currentTarget.setPointerCapture(e.pointerId);
                      onSelect(id);
                      setDragId(id);
                      setDragWindow({ start, end });
                    }}
                    onPointerMove={(e) => { if (dragId === id && e.buttons === 1 && Math.abs(e.movementX) > 0) onMove(index, timeAt(e.clientX)); }}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    className={`counterpart-pill absolute top-1 z-[1] flex h-8 cursor-grab touch-none select-none items-center whitespace-nowrap rounded-full px-2.5 active:cursor-grabbing ${FOCUS} ${pending
                      ? 'bg-gold-soft font-mono text-[13px] font-semibold text-gold-ink inset-ring-[1.5px] inset-ring-gold'
                      : 'bg-counterpart text-sm font-semibold italic text-primary-foreground'} ${selected && !pending ? 'shadow-[0_0_0_2px_var(--background),0_0_0_3.5px_var(--counterpart)]' : ''}`}
                  >
                    {pending ? '?' : counterpartLabel(line.text)}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  className="w-[330px] max-w-[calc(100vw-2rem)] rounded-2xl border-0 bg-background p-3 text-foreground shadow-toast inset-ring inset-ring-hl lg:min-w-0"
                >
                  <NameForm
                    time={time}
                    initial={line.text ?? ''}
                    frequents={frequents}
                    onSave={(text) => { if (text) onName(index, text); onNaming(null); }}
                    onLater={() => onNaming(null)}
                  />
                </PopoverContent>
              </Popover>
            );
          })}
        </div>

        {/* Playhead across both lanes. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-y-1 z-[2] w-0.5 -translate-x-px rounded-[1px] bg-foam"
          style={{ left: pct(playbackPosition) }}
        />
        </div>
      </div>
    </section>
  );
}
