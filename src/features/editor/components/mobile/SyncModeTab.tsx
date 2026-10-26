import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime } from '@/shared/utils/format-time';
import { LogoLoader } from '@ui/LogoLoader';
import { Icon } from '@/shared/ui/Icon';
import { EditorLineContextMenu } from '@features/editor/components/line/EditorLineContextMenu';
import { formatSectionLabel } from '@features/editor/constants/section-types';
import type { EditorLine } from '@features/editor/services/editor.service';

/** Long-press acts on the pressed line alone; this tab has no multi-select. */
const NO_SELECTION: Set<number> = new Set();

/** Shown in the time gutter of a line that has not been marked yet. */
const UNTIMED = '--:--.--';

interface PlayerHandle {
  currentTime?: number;
}

interface SyncModeTabProps {
  playbackPosition: number;
  lines: EditorLine[];
  activeLineIndex: number;
  setActiveLineIndex: (index: number) => void;
  /** Accepted for call-site compatibility; the mark handler reads playback position itself. */
  playerRef?: { current?: PlayerHandle | null };
  onMark?: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  duration?: number;
  isLoading?: boolean;
  handleDeleteLine?: (lineIndex: number) => void;
  handleClearLine?: (lineIndex: number) => void;
  handleAddLine?: (lineIndex: number, line?: EditorLine | null, opts?: { before?: boolean }) => void;
  handleInsertSection?: (lineIndex: number) => void;
}

export default function SyncModeTab({
  playbackPosition,
  lines,
  activeLineIndex,
  setActiveLineIndex,
  onMark,
  onUndo,
  canUndo = false,
  duration,
  isLoading = false,
  handleDeleteLine,
  handleClearLine,
  handleAddLine,
  handleInsertSection,
}: SyncModeTabProps) {
  const { t } = useTranslation();
  const currentTimestamp = useMemo(() => formatTime(playbackPosition), [playbackPosition]);
  const durationFormatted = useMemo(() => formatTime(duration ?? 0), [duration]);

  const { synced, total } = useMemo(() => {
    let synced = 0;
    let total = 0;
    for (const l of lines) {
      if (l.type === 'section') continue;
      total++;
      if (l.timestamp != null) synced++;
    }
    return { synced, total };
  }, [lines]);

  // The number the mark button names: lyric lines only, as the list counts them.
  const activeLyricNumber = useMemo(
    () => lines.slice(0, activeLineIndex + 1).filter((l) => l.type !== 'section').length,
    [lines, activeLineIndex],
  );

  const handleLineClick = useCallback((index: number) => {
    setActiveLineIndex(index);
  }, [setActiveLineIndex]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-44">
        <LogoLoader size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* How much of the song is timed */}
      <div
        role="progressbar"
        aria-label={t('editor.syncProgressLabel')}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={synced}
        className="h-1 bg-zinc-800 shrink-0"
      >
        <div className="h-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${total ? (synced / total) * 100 : 0}%` }} />
      </div>

      <h3 className="px-4 pt-3 text-xs font-semibold text-foreground/65 uppercase tracking-widest">
        {t('editor.linesProgress', { synced, total })}
      </h3>

      <ol className="flex-1 flex flex-col gap-1 px-3 py-2.5 list-none m-0">
        {lines.map((line, lineIndex) => {
          const isSection = line.type === 'section';
          const isActive = lineIndex === activeLineIndex;
          const pending = line.timestamp == null;
          return (
            <li key={line.id ?? lineIndex}>
              <EditorLineContextMenu
                line={line}
                lineIndex={lineIndex}
                isSection={isSection}
                selectedLines={NO_SELECTION}
                sectionLines={lines}
                handleDeleteLine={handleDeleteLine ?? (() => {})}
                handleClearLine={handleClearLine}
                handleAddLine={handleAddLine}
                handleInsertSection={handleInsertSection}
              >
                {isSection ? (
                  // A plain div still takes the long-press that opens the section menu.
                  <div className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--color-success)_50%,var(--foreground))] dark:text-success [-webkit-touch-callout:none]">
                    {formatSectionLabel(line.label, t)}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleLineClick(lineIndex)}
                    aria-current={isActive ? 'true' : undefined}
                    // touch-callout keeps iOS's press-and-hold sheet from taking
                    // the gesture before the context menu opens.
                    className={`w-full min-h-11 flex flex-col gap-1 text-left rounded-xl transition-colors [-webkit-touch-callout:none] ${
                      isActive ? 'p-3.5 bg-zinc-800 ring-1 ring-inset ring-primary/50' : 'px-3 py-2.5 active:bg-zinc-800/50'
                    }`}
                  >
                    <span className={`font-mono text-[11px] tabular-nums ${isActive ? 'text-primary' : 'text-foreground/45'}`}>
                      {pending ? UNTIMED : formatTime(line.timestamp as number)}
                    </span>
                    <span className={`break-words ${isActive ? 'text-xl font-bold text-foreground' : `text-[15px] font-medium ${pending ? 'text-foreground/55' : 'text-foreground'}`}`}>
                      {line.text || t('editor.emptyLine')}
                    </span>
                  </button>
                )}
              </EditorLineContextMenu>
            </li>
          );
        })}
      </ol>

      {/* Mark bar: the running time, the mark button, undo. Sticks to the bottom
          of the tab's scroll area, above the player bar. */}
      <div className="sticky bottom-0 z-10 flex flex-col gap-2.5 border-t border-zinc-800 bg-zinc-950 px-4 pt-3 pb-4">
        <div className="flex justify-between font-mono text-xs tabular-nums">
          <span data-testid="current-time-display" className="text-foreground">{currentTimestamp}</span>
          <span data-testid="duration-display" className="text-foreground/65">{durationFormatted}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            data-testid="waveform-area"
            // pointerdown, not click: on a phone the ~100ms between touch and
            // click is audible as late timestamps.
            onPointerDown={(e) => { e.preventDefault(); onMark?.(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onMark?.(); } }}
            disabled={total === 0}
            className="flex-1 h-16 rounded-[18px] bg-primary text-zinc-950 text-lg font-extrabold flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            {t('editor.markLineNumber', { number: activeLyricNumber })}
          </button>
          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label={t('editor.undo')}
              className="size-14 shrink-0 grid place-items-center rounded-full border border-zinc-700 text-foreground active:bg-zinc-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Icon name="undo" size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
