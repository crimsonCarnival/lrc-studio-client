import { formatTimestamp } from '@/shared/utils/lrc';

/**
 * Timestamp badge that supports double-click to edit and shows wheel-nudge indicator.
 */
export function TimestampBadge({ value, isSynced, isFocused, isActive, precision, onClick, onDoubleClick, onWheel, nudgeIndicator }) {
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onWheel={onWheel}
        className={`flex items-center rounded-md lg:rounded px-2 py-0.5 lg:px-1.5 lg:py-0.5 text-[9px] lg:text-[10px] font-mono tabular-nums transition-all duration-200 ease-out w-fit ${isFocused
          ? 'bg-primary/25 ring-1 ring-primary/50 text-primary font-semibold'
          : isSynced
            ? `bg-zinc-900 lg:bg-zinc-800 border border-zinc-800 lg:border-zinc-700/50 text-primary hover:border-primary/40 hover:bg-zinc-700/60 transition-opacity ${!isActive ? 'opacity-50 hover:opacity-100' : 'opacity-100'}`
            : isActive
              ? 'text-zinc-500 lg:text-zinc-400 animate-pulse-glow hover:bg-zinc-800/50 border border-transparent'
              : 'text-zinc-700 lg:text-zinc-600 hover:bg-zinc-800/50 border border-transparent'
          }`}
      >
        {isSynced ? formatTimestamp(value, precision) : '--:--.--'}
      </button>
      {nudgeIndicator && (
        <span className="absolute -right-8 text-[9px] font-mono text-primary/80 animate-fade-in pointer-events-none whitespace-nowrap">
          {nudgeIndicator}
        </span>
      )}
    </div>
  );
}
