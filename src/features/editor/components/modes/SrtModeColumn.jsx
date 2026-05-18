import { formatTimestamp } from '@/shared/utils/lrc';
import { InlineTimestampEdit } from '../line/InlineTimestampEdit';
import { TimestampBadge } from '../line/TimestampBadge';

export default function SrtModeColumn({
  line,
  lineIndex,
  isSynced,
  isActive,
  settings,
  awaitingEndMark,
  editingTimestamp,
  setEditingTimestamp,
  focusedTimestamp,
  setFocusedTimestamp,
  handleSetTimestamp,
  handleTimestampWheel,
  nudgeIndicator,
}) {
  return (
    <div className="flex flex-col gap-1">
      {/* Start time badge */}
      {editingTimestamp === 'start' && isSynced ? (
        <InlineTimestampEdit
          value={line.timestamp}
          precision={settings.editor?.timestampPrecision || 'hundredths'}
          onChange={(val) => { handleSetTimestamp(lineIndex, 'start', val); setEditingTimestamp(null); }}
          onCancel={() => setEditingTimestamp(null)}
        />
      ) : (
        <TimestampBadge
          value={line.timestamp}
          isSynced={isSynced}
          isFocused={focusedTimestamp?.lineIndex === lineIndex && focusedTimestamp?.type === 'start'}
          isActive={isActive}
          precision={settings.editor?.timestampPrecision || 'hundredths'}
          onClick={() => setFocusedTimestamp(focusedTimestamp?.lineIndex === lineIndex && focusedTimestamp?.type === 'start' ? null : { lineIndex: lineIndex, type: 'start' })}
          onDoubleClick={(e) => { e.stopPropagation(); if (isSynced) setEditingTimestamp('start'); }}
          onWheel={(e) => { if (isSynced) handleTimestampWheel(e, lineIndex, 'start'); }}
          nudgeIndicator={isSynced ? nudgeIndicator : null}
        />
      )}
      {/* End time badge */}
      {editingTimestamp === 'end' && line.endTime != null ? (
        <InlineTimestampEdit
          value={line.endTime}
          precision={settings.editor?.timestampPrecision || 'hundredths'}
          onChange={(val) => { handleSetTimestamp(lineIndex, 'end', val); setEditingTimestamp(null); }}
          onCancel={() => setEditingTimestamp(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setFocusedTimestamp(focusedTimestamp?.lineIndex === lineIndex && focusedTimestamp?.type === 'end' ? null : { lineIndex: lineIndex, type: 'end' })}
          onDoubleClick={(e) => { e.stopPropagation(); if (line.endTime != null) setEditingTimestamp('end'); }}
          className={`flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono tabular-nums transition-all w-fit ${focusedTimestamp?.lineIndex === lineIndex && focusedTimestamp?.type === 'end'
            ? 'bg-primary/25 ring-1 ring-primary/50 font-semibold'
            : line.endTime != null
              ? 'bg-zinc-800 border border-zinc-700/50 hover:border-accent-blue/40 hover:bg-zinc-700/60'
              : 'text-zinc-600 hover:bg-zinc-800/50 border border-transparent'
            }`}
        >
          {line.endTime != null
            ? (() => {
              const colorClass = 'text-accent-blue';
              return <span className={awaitingEndMark === lineIndex ? 'animate-pulse-glow text-primary' : colorClass}>{formatTimestamp(line.endTime, settings.editor?.timestampPrecision || 'hundredths')}</span>;
            })()
            : <span className={awaitingEndMark === lineIndex ? 'animate-pulse-glow text-zinc-400' : ''}>--:--.--</span>
          }
        </button>
      )}
    </div>
  );
}
