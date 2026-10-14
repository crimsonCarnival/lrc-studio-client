import type { MouseEventHandler, WheelEventHandler } from 'react';
import { formatTimestamp } from '@/shared/utils/lrc';
import { timeChipClass } from './time-chip-class';

interface TimestampBadgeProps {
  value?: number | null;
  isSynced?: boolean;
  isFocused?: boolean;
  isActive?: boolean;
  /** Playback is on this line. */
  isPlaying?: boolean;
  precision?: 'hundredths' | 'thousandths';
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onDoubleClick?: MouseEventHandler<HTMLButtonElement>;
  onWheel?: WheelEventHandler<HTMLButtonElement>;
  nudgeIndicator?: string | null;
}

/**
 * Timestamp badge that supports double-click to edit and shows wheel-nudge indicator.
 */
export function TimestampBadge({ value, isSynced, isFocused, isActive, isPlaying, precision, onClick, onDoubleClick, onWheel, nudgeIndicator }: TimestampBadgeProps) {
  return (
    <div className="relative flex w-full items-center">
      <button
        type="button"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onWheel={onWheel}
        className={timeChipClass({ isSynced, isFocused, isActive, isPlaying })}
      >
        {isSynced ? formatTimestamp(value ?? 0, precision) : '—:—'}
      </button>
      {nudgeIndicator && (
        <span className="absolute left-full ml-1 z-10 rounded bg-background px-1 font-mono text-[10px] text-primary-ink animate-fade-in pointer-events-none whitespace-nowrap">
          {nudgeIndicator}
        </span>
      )}
    </div>
  );
}
