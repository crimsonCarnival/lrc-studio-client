import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { formatTime } from '@/shared/utils/format-time';

export default function SyncModeTab({
  playbackPosition,
  lines,
  activeLineIndex,
  setActiveLineIndex,
  playerRef,
  onMark,
  duration,
  isLoading = false,
}) {
  const currentTimestamp = useMemo(() => formatTime(playbackPosition), [playbackPosition]);
  const durationFormatted = useMemo(() => formatTime(duration), [duration]);

  const handleWaveformTap = useCallback(() => {
    // Calculate position within waveform for future integration with wavesurfer.js
    if (playerRef?.current?.currentTime !== undefined) {
      // Tap-to-mark functionality would go here
      onMark?.();
    }
  }, [playerRef, onMark]);

  const handleLineClick = useCallback((index) => {
    setActiveLineIndex(index);
  }, [setActiveLineIndex]);

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center min-h-44">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="size-8 border-2 border-primary/30 border-t-primary rounded-full"
          />
        </div>
      ) : (
        <>
          {/* Waveform area - placeholder for wavesurfer.js */}
          <div
            data-testid="waveform-area"
            onClick={handleWaveformTap}
            className="min-h-44 h-40 bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-lg border border-zinc-700/50 flex items-center justify-center cursor-pointer hover:border-zinc-600/50 transition-colors"
          >
            <div className="text-center text-zinc-400">
              <div className="text-sm font-medium mb-2">Waveform Preview</div>
              <div className="text-xs text-zinc-500">Tap to mark timestamp</div>
            </div>
          </div>

          {/* Current timestamp display with duration */}
          <div className="flex flex-col items-center justify-center gap-2">
            <div
              data-testid="current-time-display"
              className="text-3xl font-mono font-bold text-primary tracking-wider"
            >
              {currentTimestamp}
            </div>
            <div
              data-testid="duration-display"
              className="text-center text-sm text-zinc-400"
            >
              / {durationFormatted}
            </div>
          </div>

          {/* Lines overview with sync status */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest px-2">
              Lines ({lines.filter((l) => l.timestamp != null).length}/{lines.length})
            </h3>
            <div className="space-y-1.5 px-2">
              {lines.map((line, index) => (
                <button
                  key={index}
                  onClick={() => handleLineClick(index)}
                  className={`w-full text-left p-2 rounded-lg transition-colors text-sm ${
                    index === activeLineIndex
                      ? 'bg-primary/10 border border-primary text-primary'
                      : line.timestamp != null
                        ? 'bg-zinc-900/50 border border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        : 'bg-zinc-950/50 border border-zinc-800/50 text-zinc-500 hover:border-zinc-700/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex-1 truncate">{line.text || '(empty)'}</span>
                    {line.timestamp != null && (
                      <span className="text-xs font-mono text-zinc-400 flex-shrink-0">
                        {formatTime(line.timestamp)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
