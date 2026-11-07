import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/utils';
import { Button } from '@ui/button';

export type FilterChip<T extends string> = {
  value: T;
  label: string;
  /** Omit while loading: a row of zeros reads as "you have no projects". */
  count?: number;
};

/**
 * Phone-width counterpart of CountTabs: pill chips in a horizontally scrollable row, with
 * `trailing` (the sort control) scrolling along at the end. Same contract as CountTabs, so
 * the filter state stays owned by the page.
 */
export function HomeFilterChips<T extends string>({ chips, value, onChange, label, trailing }: {
  chips: readonly FilterChip<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  trailing?: ReactNode;
}) {
  return (
    <div role="group" aria-label={label} className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 hide-scrollbar">
      {chips.map((chip) => {
        const active = chip.value === value;
        return (
          <Button
            key={chip.value}
            type="button"
            variant="ghost"
            size={null}
            aria-pressed={active}
            onClick={() => onChange(chip.value)}
            className={cn(
              'h-11 shrink-0 gap-2 rounded-pill px-4 text-sm inset-ring inset-ring-hl',
              active ? 'bg-primary-soft text-primary-ink inset-ring-0' : 'text-subtle hover:bg-raised hover:text-foreground',
            )}
          >
            {chip.label}
            {chip.count !== undefined && (
              <span className={cn('font-mono text-xs tabular-nums', active ? 'text-primary-ink' : 'text-faint')}>{chip.count}</span>
            )}
          </Button>
        );
      })}
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}
