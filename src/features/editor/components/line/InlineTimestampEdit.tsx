import { useState, useRef, useEffect } from 'react';
import type { WheelEvent } from 'react';

interface InlineTimestampEditProps {
  value?: number | null;
  onChange: (value: number) => void;
  onCancel: () => void;
  precision?: 'hundredths' | 'thousandths';
}

/**
 * Inline timestamp editor — double-click to edit, scroll to adjust, shows nudge indicator.
 */
export function InlineTimestampEdit({ value, onChange, onCancel, precision }: InlineTimestampEditProps) {
  const fmt = (s: number | null | undefined) => {
    if (s == null || isNaN(s) || s < 0) return '00:00.00';
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    const mm = String(mins).padStart(2, '0');
    const ss = secs.toFixed(precision === 'thousandths' ? 3 : 2).padStart(precision === 'thousandths' ? 6 : 5, '0');
    return `${mm}:${ss}`;
  };

  const [text, setText] = useState(() => fmt(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const parseInput = (str: string): number | null => {
    const m = str.match(/^(\d{1,3}):(\d{1,2})\.(\d{1,3})$/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + parseInt(m[3], 10) / Math.pow(10, m[3].length);
  };

  const commit = () => {
    const parsed = parseInput(text);
    if (parsed != null && parsed >= 0) {
      onChange(parsed);
    } else {
      onCancel();
    }
  };

  const handleWheel = (e: WheelEvent<HTMLInputElement>) => {
    const delta = e.deltaY < 0 ? 0.01 : -0.01;
    const parsed = parseInput(text);
    if (parsed != null) {
      const next = Math.max(0, parsed + delta);
      setText(fmt(next));
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        e.stopPropagation();
      }}
      onWheel={handleWheel}
      onClick={(e) => e.stopPropagation()}
      className="w-[82px] text-[10px] font-mono tabular-nums bg-zinc-800 border border-primary/50 rounded px-1.5 py-0.5 text-primary outline-none focus:ring-1 focus:ring-primary/50"
    />
  );
}
