import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime } from '@/shared/utils/format-time';
import { LogoLoader } from '@ui/LogoLoader';
import { Icon } from '@/shared/ui/Icon';
import { EditorLineContextMenu } from '@features/editor/components/line/EditorLineContextMenu';
import type { EditorLine } from '@features/editor/services/editor.service';

/** Long-press acts on the pressed line alone; this tab has no multi-select. */
const NO_SELECTION: Set<number> = new Set();

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

  // Gating this on playerRef.current.currentTime made the tap a no-op for
  // YouTube sources: that player lives behind a Proxy/WeakMap and does not
  // surface currentTime on the ref, so the guard failed silently and the whole
  // mobile sync affordance did nothing. onMark reads the playback position
  // itself, so it never needed the check.
  const handleWaveformTap = useCallback(() => {
    onMark?.();
  }, [onMark]);

  const handleLineClick = useCallback((index: number) => {
    setActiveLineIndex(index);
  }, [setActiveLineIndex]);

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center min-h-44">
          <LogoLoader size={32} />
        </div>
      ) : (
        <>
          {/* The mark surface. This used to be a 160px box captioned "waveform
              preview", but no waveform is ever drawn here — not for YouTube,
              which has none, and not for local audio either, since this tab
              never mounted WaveSurfer. It advertised a view that did not exist
              and cost a third of the screen. It now shows the thing that
              actually matters while syncing — the running time — and is itself
              the tap target. */}
          <button
            type="button"
            data-testid="waveform-area"
            onClick={handleWaveformTap}
            className="w-full rounded-xl border border-zinc-700/50 bg-gradient-to-b from-zinc-800/80 to-zinc-900 px-4 py-5 flex flex-col items-center justify-center gap-1 active:scale-[0.99] active:border-primary/60 transition-all [-webkit-touch-callout:none]"
          >
            <div
              data-testid="current-time-display"
              className="text-4xl font-mono font-bold text-primary tracking-wider tabular-nums leading-none"
            >
              {currentTimestamp}
            </div>
            <div data-testid="duration-display" className="text-sm text-zinc-400 tabular-nums">
              / {durationFormatted}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
              <Icon name="ads_click" size={14} />
              {t('editor.tapToMarkTimestamp')}
            </div>
          </button>

          {/* Lines overview with sync status */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest px-2">
              {t('editor.linesProgress', {
                synced: lines.filter((l) => l.type !== 'section' && l.timestamp != null).length,
                total: lines.filter((l) => l.type !== 'section').length,
              })}
            </h3>
            <div className="space-y-1.5 px-2">
              {lines.map((line, lineIndex) => (
                <EditorLineContextMenu
                  key={line.id ?? lineIndex}
                  line={line}
                  lineIndex={lineIndex}
                  isSection={line.type === 'section'}
                  selectedLines={NO_SELECTION}
                  sectionLines={lines}
                  handleDeleteLine={handleDeleteLine ?? (() => {})}
                  handleClearLine={handleClearLine}
                  handleAddLine={handleAddLine}
                  handleInsertSection={handleInsertSection}
                >
                  <button
                    onClick={() => handleLineClick(lineIndex)}
                    // touch-callout keeps iOS's press-and-hold sheet from taking
                    // the gesture before the context menu opens.
                    className={`w-full text-left p-2 rounded-lg transition-colors text-sm [-webkit-touch-callout:none] ${
                      lineIndex === activeLineIndex
                        ? 'bg-primary/10 border border-primary text-primary'
                        : line.timestamp != null
                          ? 'bg-zinc-900/50 border border-zinc-800 text-zinc-300 hover:border-zinc-700'
                          : 'bg-zinc-950/50 border border-zinc-800/50 text-zinc-500 hover:border-zinc-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex-1 truncate">{line.text || t('editor.emptyLine')}</span>
                      {line.timestamp != null && (
                        <span className="text-xs font-mono text-zinc-400 flex-shrink-0">
                          {formatTime(line.timestamp)}
                        </span>
                      )}
                    </div>
                  </button>
                </EditorLineContextMenu>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
