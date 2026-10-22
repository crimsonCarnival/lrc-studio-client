import type { WheelEvent } from 'react';
import { formatTimestamp } from '@/shared/utils/lrc';
import { InlineTimestampEdit } from '../line/InlineTimestampEdit';
import { TimestampBadge } from '../line/TimestampBadge';
import { timeChipClass } from '../line/time-chip-class';
import type { EditorLine } from '../../services/editor.service';

interface FocusedTimestamp {
  lineIndex: number;
  type: string;
}

interface SrtModeColumnProps {
  /** Seek to this line's start and play — a click on the timestamp, as in the public view. */
  onSeekLine?: () => void;
  line: EditorLine & { endTime?: number | null };
  lineIndex: number;
  isSynced?: boolean;
  isActive?: boolean;
  isPlaying?: boolean;
  settings: { editor?: { timestampPrecision?: string } };
  awaitingEndMark?: number | null;
  editingTimestamp: string | null;
  setEditingTimestamp: (v: string | null) => void;
  focusedTimestamp: FocusedTimestamp | null;
  setFocusedTimestamp: (v: FocusedTimestamp | null) => void;
  handleSetTimestamp: (lineIndex: number, which: string, val: number) => void;
  handleTimestampWheel: (e: WheelEvent<HTMLButtonElement>, lineIndex: number, which: string) => void;
  nudgeIndicator?: string | null;
}

export default function SrtModeColumn({
  onSeekLine,
  line,
  lineIndex,
  isSynced,
  isActive,
  isPlaying,
  settings,
  awaitingEndMark,
  editingTimestamp,
  setEditingTimestamp,
  focusedTimestamp,
  setFocusedTimestamp,
  handleSetTimestamp,
  handleTimestampWheel,
  nudgeIndicator,
}: SrtModeColumnProps) {
  const precision = (settings.editor?.timestampPrecision || 'hundredths') as 'hundredths' | 'thousandths';
  return (
    <div className="flex flex-col gap-1">
      {/* Start time badge */}
      {editingTimestamp === 'start' && isSynced ? (
        <InlineTimestampEdit
          value={line.timestamp}
          precision={precision}
          onChange={(val) => { handleSetTimestamp(lineIndex, 'start', val); setEditingTimestamp(null); }}
          onCancel={() => setEditingTimestamp(null)}
        />
      ) : (
        <TimestampBadge
          value={line.timestamp}
          isSynced={isSynced}
          isFocused={focusedTimestamp?.lineIndex === lineIndex && focusedTimestamp?.type === 'start'}
          isActive={isActive}
          isPlaying={isPlaying}
          precision={precision}
          onClick={() => { if (isSynced) onSeekLine?.(); setFocusedTimestamp(focusedTimestamp?.lineIndex === lineIndex && focusedTimestamp?.type === 'start' ? null : { lineIndex: lineIndex, type: 'start' }); }}
          onDoubleClick={(e) => { e.stopPropagation(); if (isSynced) setEditingTimestamp('start'); }}
          onWheel={(e) => { if (isSynced) handleTimestampWheel(e, lineIndex, 'start'); }}
          nudgeIndicator={isSynced ? nudgeIndicator : null}
        />
      )}
      {/* End time badge */}
      {editingTimestamp === 'end' && line.endTime != null ? (
        <InlineTimestampEdit
          value={line.endTime}
          precision={precision}
          onChange={(val) => { handleSetTimestamp(lineIndex, 'end', val); setEditingTimestamp(null); }}
          onCancel={() => setEditingTimestamp(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setFocusedTimestamp(focusedTimestamp?.lineIndex === lineIndex && focusedTimestamp?.type === 'end' ? null : { lineIndex: lineIndex, type: 'end' })}
          onDoubleClick={(e) => { e.stopPropagation(); if (line.endTime != null) setEditingTimestamp('end'); }}
          // Same chip as the start time; the end reads in foam so the pair is told apart by colour too.
          className={timeChipClass({
            isSynced: line.endTime != null,
            isFocused: focusedTimestamp?.lineIndex === lineIndex && focusedTimestamp?.type === 'end',
            isActive: awaitingEndMark === lineIndex,
          })}
        >
          {line.endTime != null
            ? <span className={awaitingEndMark === lineIndex ? 'animate-pulse-glow text-primary-ink' : 'text-foam-ink'}>{formatTimestamp(line.endTime, precision)}</span>
            : '—:—'
          }
        </button>
      )}
    </div>
  );
}
