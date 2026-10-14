import { cn } from '@/shared/utils/utils';

type TimeChipState = {
  isSynced?: boolean;
  isFocused?: boolean;
  isActive?: boolean;
  /** Playback is on this line: the chip fills so the row reads as "now" at a glance. */
  isPlaying?: boolean;
};

/**
 * Shared look of a line's time chip (redesign sheet 13): filled = playing now,
 * dashed = not marked yet, ringed = focused for keyboard nudging.
 */
export function timeChipClass({ isSynced, isFocused, isActive, isPlaying }: TimeChipState): string {
  return cn(
    'flex h-7 w-full items-center justify-center rounded-lg px-2 font-mono text-[13px] font-medium tabular-nums transition-[background-color,color,box-shadow] duration-[var(--duration-state)]',
    !isSynced
      ? cn('text-faint outline-[1.5px] -outline-offset-[1.5px] outline-dashed outline-hl hover:text-subtle', isActive && 'animate-pulse-glow text-subtle')
      : isPlaying
        ? 'bg-primary text-primary-foreground'
        : 'bg-raised text-foreground hover:bg-overlay',
    isFocused && 'inset-ring-2 inset-ring-iris',
  );
}
