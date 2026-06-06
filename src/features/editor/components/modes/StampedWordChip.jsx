import { useRef, useEffect } from 'react';

export function StampedWordChip({ time, focusedTimestamp, lineIndex, wi, isSecondary, children, className, onClick, onDoubleClick, ...rest }) {
  const prevTimeRef = useRef(null);
  const btnRef = useRef(null);
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
    prevTimeRef.current = time;

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
