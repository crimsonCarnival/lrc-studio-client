import { useEffect, useRef, useState } from 'react';
import { EMOJI_MAP } from './reaction-constants';

interface ReactionPickerProps {
  myReaction?: string | null;
  onReact: (code: string) => void;
  onClose: () => void;
}

export function ReactionPicker({ myReaction, onReact, onClose }: ReactionPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [custom, setCustom] = useState('');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const submitCustom = () => {
    const trimmed = custom.trim();
    if (!trimmed) return;
    onReact(trimmed);
    setCustom('');
  };

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-1.5 left-0 z-50 flex flex-col gap-1 p-1.5 bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-xl shadow-black/50 backdrop-blur-sm"
    >
      {/* Fixed emoji row */}
      <div className="flex items-center gap-0.5">
        {Object.entries(EMOJI_MAP).map(([code, emoji]) => (
          <button
            key={code}
            onClick={() => onReact(code)}
            className={[
              'size-9 rounded-xl flex items-center justify-center text-lg hover:bg-zinc-800 transition-colors duration-100 relative',
              myReaction === code ? 'bg-primary/8 ring-1 ring-primary/40' : '',
            ].join(' ')}
          >
            <span className="transition-transform duration-100 hover:scale-125 leading-none select-none">
              {emoji as string}
            </span>
          </button>
        ))}
      </div>

      {/* Free-input row */}
      <div className="flex items-center gap-1 px-0.5">
        <input
          ref={inputRef}
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitCustom(); } }}
          placeholder="✨"
          maxLength={8}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-primary/60 min-w-0"
        />
        <button
          onClick={submitCustom}
          disabled={!custom.trim()}
          className="shrink-0 px-2 py-1 text-xs rounded-lg bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
