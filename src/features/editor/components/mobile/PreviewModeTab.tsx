import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';

interface PreviewLine {
  text?: string;
  type?: string;
  [key: string]: unknown;
}

interface PreviewModeTabProps {
  lines?: PreviewLine[];
  activeLineIndex: number;
  isPlaying?: boolean;
}

export default function PreviewModeTab({
  lines,
  activeLineIndex,
  isPlaying,
}: PreviewModeTabProps) {
  const { t } = useTranslation();
  const currentLine = useMemo(() => {
    if (!lines || lines.length === 0) return null;
    return lines[activeLineIndex];
  }, [lines, activeLineIndex]);

  const nextLine = useMemo(() => {
    if (!lines || activeLineIndex >= lines.length - 1) return null;
    return lines[activeLineIndex + 1];
  }, [lines, activeLineIndex]);

  const totalLyricLines = useMemo(
    () => lines?.filter(l => l.type !== 'section').length || 0,
    [lines]
  );
  const currentLyricPosition = useMemo(
    () => lines?.slice(0, activeLineIndex + 1).filter(l => l.type !== 'section').length || 0,
    [lines, activeLineIndex]
  );

  const progressPercent = useMemo(() => {
    if (!totalLyricLines) return 0;
    return (currentLyricPosition / totalLyricLines) * 100;
  }, [totalLyricLines, currentLyricPosition]);

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

  return (
    <div
      data-testid="preview-container"
      className="flex flex-col items-center justify-center min-h-96 gap-8 p-4"
    >
      {/* Current line - Large display */}
      <div className="w-full text-center space-y-4">
        <h2
          className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-primary leading-tight break-words"
        >
          {currentLine?.text || ''}
        </h2>
      </div>

      {/* Next line preview */}
      {nextLine && (
        <div className="w-full text-center space-y-2 border-t border-zinc-800/50 pt-6">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            {t('editor.nextLine')}
          </div>
          <p className="text-lg text-zinc-400">{nextLine.text}</p>
        </div>
      )}

      {/* Progress indicator */}
      <div className="w-full space-y-2">
        <div
          data-testid="progress-indicator"
          className="w-full h-1 bg-zinc-800/50 rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-gradient-to-r from-primary/50 to-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{currentLyricPosition}</span>
          <span>{totalLyricLines}</span>
        </div>
      </div>

      {/* Playback info */}
      <div
        data-testid="playback-info"
        className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-900/50 px-4 py-2 rounded-lg border border-zinc-800/50"
      >
        {isPlaying ? (
          <>
            <Icon name="play_arrow" size={16} className="text-primary animate-pulse" />
            <span>{t('editor.playing')}</span>
          </>
        ) : (
          <>
            <Icon name="pause" size={16} className="text-zinc-500" />
            <span>{t('editor.paused')}</span>
          </>
        )}
      </div>
    </div>
  );
}
