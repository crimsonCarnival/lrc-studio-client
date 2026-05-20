import { useMemo } from 'react';
import { Play, Pause } from 'lucide-react';

export default function PreviewModeTab({
  lines,
  activeLineIndex,
  isPlaying,
}) {
  const currentLine = useMemo(() => {
    if (!lines || lines.length === 0) return null;
    return lines[activeLineIndex];
  }, [lines, activeLineIndex]);

  const nextLine = useMemo(() => {
    if (!lines || activeLineIndex >= lines.length - 1) return null;
    return lines[activeLineIndex + 1];
  }, [lines, activeLineIndex]);

  const progressPercent = useMemo(() => {
    if (!lines || lines.length === 0) return 0;
    return ((activeLineIndex + 1) / lines.length) * 100;
  }, [lines, activeLineIndex]);

  if (!lines || lines.length === 0) {
    return (
      <div
        data-testid="empty-preview"
        className="flex-1 flex items-center justify-center h-96 text-zinc-400"
      >
        <div className="text-center">
          <div className="text-sm font-medium mb-2">No lyrics to preview</div>
          <div className="text-xs text-zinc-500">Add lyrics in the editor to see preview</div>
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
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary leading-tight break-words"
        >
          {currentLine?.text || ''}
        </h2>
      </div>

      {/* Next line preview */}
      {nextLine && (
        <div className="w-full text-center space-y-2 border-t border-zinc-800/50 pt-6">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Next Line
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
          <span>{activeLineIndex + 1}</span>
          <span>{lines.length}</span>
        </div>
      </div>

      {/* Playback info */}
      <div
        data-testid="playback-info"
        className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-900/50 px-4 py-2 rounded-lg border border-zinc-800/50"
      >
        {isPlaying ? (
          <>
            <Play className="size-4 text-primary animate-pulse" />
            <span>Playing</span>
          </>
        ) : (
          <>
            <Pause className="size-4 text-zinc-500" />
            <span>Paused</span>
          </>
        )}
      </div>
    </div>
  );
}
