import { useRef, useEffect } from 'react';
import type { ButtonHTMLAttributes } from 'react';

interface FocusedTimestamp {
  type?: string;
  wordIndex?: number;
  lineIndex?: number;
}

interface StampedWordChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  time?: number | null;
  focusedTimestamp?: FocusedTimestamp | null;
  lineIndex: number;
  wi: number;
  isSecondary?: boolean;
}

export function StampedWordChip({ time, focusedTimestamp, lineIndex, wi, isSecondary, children, className, onClick, onDoubleClick, ...rest }: StampedWordChipProps) {
  const prevTimeRef = useRef<number | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const isFocused = (focusedTimestamp?.type === (isSecondary ? 'secondaryWord' : 'word')) && focusedTimestamp?.wordIndex === wi && focusedTimestamp?.lineIndex === lineIndex;

  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;

    const cleanup = () => el.classList.remove('animate-word-stamp');

    // Trigger pop animation whenever time transitions from null to a value
    if (prevTimeRef.current == null && time != null) {
      el.classList.remove('animate-word-stamp');
      void el.offsetWidth; // force reflow to restart animation
      el.classList.add('animate-word-stamp');
      el.addEventListener('animationend', cleanup, { once: true });
    }
    prevTimeRef.current = time ?? null;

    return () => {
      el.removeEventListener('animationend', cleanup);
    };
  }, [time]);

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`${className} ${isFocused ? '!bg-primary !text-zinc-950 !border-primary ring-2 ring-primary/40 shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : ''}`}
      {...rest}
    >
      {children}
    </button>
  );
}
