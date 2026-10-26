import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { formatTime } from '@/shared/utils/format-time';
import { formatSectionLabel } from '@features/editor/constants/section-types';

interface PreviewLine {
  id?: string;
  text?: string;
  type?: string;
  label?: string;
  timestamp?: number | null;
  [key: string]: unknown;
}

interface PreviewModeTabProps {
  lines?: PreviewLine[];
  activeLineIndex: number;
  isPlaying?: boolean;
  /** Moves the editor cursor; used by the "first untimed line" banner. */
  onSelectLine?: (index: number) => void;
}

/** Shown in the time gutter of a line that has not been marked yet. */
const UNTIMED = '--:--.--';

export default function PreviewModeTab({
  lines,
  activeLineIndex,
  isPlaying,
  onSelectLine,
}: PreviewModeTabProps) {
  const { t } = useTranslation();
  const activeRef = useRef<HTMLLIElement>(null);

  const { total, timed, firstUntimed } = useMemo(() => {
    let total = 0;
    let timed = 0;
    let firstUntimed = -1;
    (lines ?? []).forEach((l, i) => {
      if (l.type === 'section') return;
      total++;
      if (l.timestamp != null) timed++;
      else if (firstUntimed === -1) firstUntimed = i;
    });
    return { total, timed, firstUntimed };
  }, [lines]);

  // Keep the current line in view as the cursor moves.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeLineIndex]);

  if (!lines || lines.length === 0) {
    return (
      <div
        data-testid="empty-preview"
        className="flex-1 flex items-center justify-center h-96 text-zinc-400"
      >
        <div className="text-center">
          <div className="text-sm font-medium mb-2">{t('editor.noLyricsToPreview')}</div>
          <div className="text-xs text-zinc-500">{t('editor.addLyricsToPreview')}</div>
        </div>
      </div>
    );
  }

  const untimed = total - timed;

  return (
    <div data-testid="preview-container" className="flex flex-col gap-3 p-3">
      {/* Review summary */}
      <div className="flex flex-col gap-1.5 px-1">
        <div className="flex items-center justify-between gap-3 text-xs text-foreground/65">
          <span>{t('editor.linesTimedCount', { timed, total })}</span>
          <span data-testid="playback-info" className="inline-flex items-center gap-1">
            <Icon name={isPlaying ? 'play_arrow' : 'pause'} size={14} className={isPlaying ? 'text-primary' : undefined} />
            {isPlaying ? t('editor.playing') : t('editor.paused')}
          </span>
        </div>
        <div data-testid="progress-indicator" className="h-1 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${total ? (timed / total) * 100 : 0}%` }} />
        </div>
      </div>

      {untimed > 0 && (
        <button
          type="button"
          onClick={() => onSelectLine?.(firstUntimed)}
          className="flex items-center gap-2 min-h-11 px-3 py-2.5 rounded-[10px] border border-warning/35 bg-warning/10 text-left text-[13px] font-medium text-foreground active:bg-warning/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <span className="flex-1">{t('preview.untimedJump', { count: untimed })}</span>
          <Icon name="arrow_forward" size={16} />
        </button>
      )}

      <ol className="flex flex-col gap-0.5 list-none m-0 p-0">
        {lines.map((line, i) => {
          if (line.type === 'section') {
            return (
              <li
                key={line.id ?? i}
                className="px-2 pt-2.5 pb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--color-success)_50%,var(--foreground))] dark:text-success"
              >
                {formatSectionLabel(line.label, t)}
              </li>
            );
          }
          const isActive = i === activeLineIndex;
          const pending = line.timestamp == null;
          return (
            <li
              key={line.id ?? i}
              ref={isActive ? activeRef : undefined}
              aria-current={isActive ? 'true' : undefined}
              className={`flex gap-2 px-2 py-[7px] rounded-[10px] leading-snug ${
                isActive
                  ? 'bg-zinc-800 shadow-[inset_3px_0_0_var(--color-primary)] text-lg font-bold text-foreground'
                  : `text-[15px] ${i > activeLineIndex && !pending ? 'text-foreground/85' : 'text-foreground/55'}`
              }`}
            >
              <span className={`flex-none w-[58px] pt-1 font-mono text-[10px] tabular-nums ${isActive ? 'text-primary' : 'text-foreground/45'}`}>
                {pending ? UNTIMED : formatTime(line.timestamp as number)}
              </span>
              <span className="min-w-0 break-words">{line.text}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
