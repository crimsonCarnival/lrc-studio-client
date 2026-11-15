import type { KeyboardEvent, PointerEvent } from 'react';
import { cn } from '@/shared/utils/utils';

interface PanelResizeHandleProps {
  /** Accessible name, e.g. "Resize side panel". */
  label: string;
  /** The edge of the panel this handle sits on. */
  edge: 'left' | 'right';
  value: number;
  min: number;
  max: number;
  dragging?: boolean;
  onPointerDown: (e: PointerEvent<HTMLElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  onDoubleClick: () => void;
  className?: string;
}

/**
 * The draggable edge of a docked panel (the ARIA window-splitter pattern). The parent must be
 * `relative`. It straddles the panel's border, so the border itself reads as the thing to grab.
 */
export function PanelResizeHandle({ label, edge, value, min, max, dragging, onPointerDown, onKeyDown, onDoubleClick, className }: PanelResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      data-dragging={dragging || undefined}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={onDoubleClick}
      className={cn(
        'group absolute inset-y-0 z-20 w-2 cursor-col-resize touch-none select-none focus-visible:outline-none',
        edge === 'left' ? '-left-1' : '-right-1',
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-transparent transition-colors group-hover:bg-primary/60 group-focus-visible:bg-focus group-data-[dragging]:bg-primary"
      />
    </div>
  );
}
