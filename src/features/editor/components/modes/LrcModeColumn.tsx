import type { WheelEvent } from 'react';
import { InlineTimestampEdit } from '../line/InlineTimestampEdit';
import { TimestampBadge } from '../line/TimestampBadge';
import type { EditorLine } from '../../services/editor.service';

interface FocusedTimestamp {
  lineIndex: number;
  type: string;
}

interface LrcModeColumnProps {
  line: EditorLine;
  lineIndex: number;
  isSynced?: boolean;
  isActive?: boolean;
  settings: { editor?: { timestampPrecision?: string } };
  editingTimestamp: string | null;
  setEditingTimestamp: (v: string | null) => void;
  focusedTimestamp: FocusedTimestamp | null;
  setFocusedTimestamp: (v: FocusedTimestamp | null) => void;
  handleSetTimestamp: (lineIndex: number, which: string, val: number) => void;
  handleTimestampWheel: (e: WheelEvent<HTMLButtonElement>, lineIndex: number, which: string) => void;
  nudgeIndicator?: string | null;
}

export default function LrcModeColumn({
  line,
  lineIndex,
  isSynced,
  isActive,
  settings,
  editingTimestamp,
  setEditingTimestamp,
  focusedTimestamp,
  setFocusedTimestamp,
  handleSetTimestamp,
  handleTimestampWheel,
  nudgeIndicator,
}: LrcModeColumnProps) {
  const precision = (settings.editor?.timestampPrecision || 'hundredths') as 'hundredths' | 'thousandths';
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
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
            precision={precision}
            onClick={() => setFocusedTimestamp(focusedTimestamp?.lineIndex === lineIndex && focusedTimestamp?.type === 'start' ? null : { lineIndex: lineIndex, type: 'start' })}
            onDoubleClick={(e) => { e.stopPropagation(); if (isSynced) setEditingTimestamp('start'); }}
            onWheel={(e) => { if (isSynced) handleTimestampWheel(e, lineIndex, 'start'); }}
            nudgeIndicator={isSynced ? nudgeIndicator : null}
          />
        )}
      </div>
    </div>
  );
}
