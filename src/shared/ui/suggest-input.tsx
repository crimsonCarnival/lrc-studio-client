import { useEffect, useId, useRef, useState } from 'react';
import type { ComponentProps, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/utils/utils';

type SuggestInputProps = Omit<ComponentProps<'input'>, 'list' | 'role'> & {
  suggestions: string[];
};

// A controlled input only sees a change if React's own value setter is bypassed, so a picked
// suggestion is written through the native setter and announced with a real `input` event. That
// keeps this a drop-in for both controlled and uncontrolled inputs, like <datalist> was.
function setNativeValue(el: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Text input with a themed suggestion list. Replaces `<input list>` + `<datalist>`, whose popup is
 * drawn by the browser and cannot be styled. Typing filters the list; picking fills the field
 * and leaves committing (Enter, comma...) to the caller, exactly as the datalist did.
 */
export function SuggestInput({ suggestions, className, onKeyDown, onFocus, onBlur, onChange, ...props }: SuggestInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [box, setBox] = useState<{ left: number; top: number; width: number } | null>(null);

  const q = query.trim().toLowerCase();
  const matches = suggestions.filter((s) => s.toLowerCase() !== q && (!q || s.toLowerCase().includes(q)));
  const visible = open && matches.length > 0;

  useEffect(() => {
    if (!visible) return;
    const place = () => {
      const r = ref.current?.getBoundingClientRect();
      if (r) setBox({ left: r.left, top: r.bottom + 4, width: Math.max(r.width, 140) });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [visible]);

  function pick(value: string) {
    if (ref.current) {
      setNativeValue(ref.current, value);
      ref.current.focus();
    }
    setOpen(false);
    setActive(-1);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (visible) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, matches.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' && active >= 0) { e.preventDefault(); e.stopPropagation(); pick(matches[active]); return; }
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); setActive(-1); return; }
    } else if (e.key === 'ArrowDown' && matches.length > 0) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    onKeyDown?.(e);
  }

  return (
    <>
      <input
        {...props}
        ref={ref}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
        className={className}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(-1); onChange?.(e); }}
        onFocus={(e) => { setQuery(e.currentTarget.value); setOpen(true); onFocus?.(e); }}
        onBlur={(e) => { setOpen(false); setActive(-1); onBlur?.(e); }}
        onKeyDown={handleKeyDown}
      />
      {visible && box && createPortal(
        <ul
          role="listbox"
          id={listId}
          style={{ position: 'fixed', left: box.left, top: box.top, minWidth: box.width }}
          className="z-popover max-h-52 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          {matches.map((s, i) => (
            <li
              key={s}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: click fires after the input blurs and closes the list.
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              className={cn('cursor-pointer rounded-md px-2.5 py-1.5 text-sm', i === active ? 'bg-raised text-foreground' : 'text-subtle hover:bg-raised hover:text-foreground')}
            >
              {s}
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </>
  );
}
