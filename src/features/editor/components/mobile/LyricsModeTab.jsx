import { useState, useCallback, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { formatTime } from '@/shared/utils/format-time';

export default function LyricsModeTab({
  lines,
  activeLineIndex,
  setActiveLineIndex,
  onEditLine,
  onUpdateTimestamp,
}) {
  const [editText, setEditText] = useState(lines[activeLineIndex]?.text || '');
  const [editTimestamp, setEditTimestamp] = useState(lines[activeLineIndex]?.timestamp ?? '');

  const handlePreviousLine = useCallback(() => {
    if (activeLineIndex > 0) {
      setActiveLineIndex(activeLineIndex - 1);
      setEditText(lines[activeLineIndex - 1]?.text || '');
      setEditTimestamp(lines[activeLineIndex - 1]?.timestamp ?? '');
    }
  }, [activeLineIndex, setActiveLineIndex, lines]);

  const handleNextLine = useCallback(() => {
    if (activeLineIndex < lines.length - 1) {
      setActiveLineIndex(activeLineIndex + 1);
      setEditText(lines[activeLineIndex + 1]?.text || '');
      setEditTimestamp(lines[activeLineIndex + 1]?.timestamp ?? '');
    }
  }, [activeLineIndex, setActiveLineIndex, lines]);

  const handleTextChange = useCallback(
    (e) => {
      const newText = e.target.value;
      setEditText(newText);
      onEditLine?.(activeLineIndex, newText);
    },
    [activeLineIndex, onEditLine]
  );

  const handleTimestampChange = useCallback(
    (e) => {
      const value = e.target.value;
      const timestamp = value === '' ? null : parseInt(value, 10);
      setEditTimestamp(timestamp ?? '');
      onUpdateTimestamp?.(activeLineIndex, timestamp);
    },
    [activeLineIndex, onUpdateTimestamp]
  );

  const lineProgressText = useMemo(
    () => `${activeLineIndex + 1} / ${lines.length}`,
    [activeLineIndex, lines.length]
  );

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Current line editor section */}
      <div className="space-y-3 border-b border-zinc-800/50 pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-300">Current Line</h3>
          <span
            data-testid="line-counter"
            className="text-xs font-mono text-zinc-400 bg-zinc-900/50 px-2 py-1 rounded"
          >
            {lineProgressText}
          </span>
        </div>

        {/* Text input */}
        <input
          type="text"
          value={editText}
          onChange={handleTextChange}
          placeholder="Enter lyrics..."
          className="w-full h-11 px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary/50 focus:bg-zinc-900"
        />

        {/* Timestamp input */}
        <div className="flex gap-2">
          <input
            data-testid="timestamp-input"
            type="number"
            value={editTimestamp === '' ? '' : editTimestamp}
            onChange={handleTimestampChange}
            placeholder="Timestamp (ms)"
            className="flex-1 h-11 px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary/50 focus:bg-zinc-900"
          />
          {editTimestamp !== '' && (
            <div className="h-11 flex items-center px-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-400">
              {formatTime(editTimestamp)}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handlePreviousLine}
            disabled={activeLineIndex === 0}
            variant="outline"
            size="lg"
            className="h-11 lg:h-9 flex-1"
          >
            <ChevronUp className="size-4 mr-1" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          <Button
            onClick={handleNextLine}
            disabled={activeLineIndex === lines.length - 1}
            variant="outline"
            size="lg"
            className="h-11 lg:h-9 flex-1"
          >
            <span className="hidden sm:inline">Next</span>
            <span className="sm:hidden">Next</span>
            <ChevronDown className="size-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Lines list */}
      <div className="flex-1 min-h-0 flex flex-col">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
          All Lines
        </h3>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {lines.map((line, index) => (
            <button
              key={index}
              data-line-index={index}
              onClick={() => setActiveLineIndex(index)}
              className={`w-full text-left p-2.5 rounded-lg transition-colors text-sm ${
                index === activeLineIndex
                  ? 'bg-primary/10 border border-primary text-primary font-medium'
                  : 'bg-zinc-900/50 border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/70'
              }`}
            >
              <div className="flex items-start justify-between gap-2 min-w-0">
                <span className="text-xs text-zinc-500 flex-shrink-0">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 truncate">{line.text || '(empty)'}</span>
                {line.timestamp != null && (
                  <span className="text-xs font-mono text-zinc-500 flex-shrink-0">
                    {formatTime(line.timestamp)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
