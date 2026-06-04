import { useEffect, useRef } from 'react';
import { EMOJI_MAP } from './reaction-constants';

export function ReactionPicker({ myReaction, onReact, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-1.5 left-0 z-50 flex items-center gap-0.5 p-1.5 bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-xl shadow-black/50 backdrop-blur-sm transition-all duration-150 origin-bottom"
      style={{
        opacity: 1,
        transform: 'scaleY(1)',
      }}
    >
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
            {emoji}
          </span>
        </button>
      ))}
    </div>
  );
}
