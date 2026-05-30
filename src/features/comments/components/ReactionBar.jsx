import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ReactionPicker } from './ReactionPicker';

export const EMOJI_MAP = {
  heart: '❤️',
  fire: '🔥',
  wow: '😮',
  laugh: '😂',
  clap: '👏',
  music: '🎵',
};

export function ReactionBar({
  reactions = [],
  myReaction = null,
  onReact,
  disabled = false,
}) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const triggerRef = useRef(null);

  const active = reactions.filter(r => r.count > 0);

  return (
    <div className="flex items-center flex-wrap gap-1">
      {active.map(({ emoji, count }) => (
        <button
          key={emoji}
          onClick={() => !disabled && onReact?.(emoji)}
          disabled={disabled}
          className={[
            'group flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all duration-150 select-none tabular-nums',
            myReaction === emoji
              ? 'bg-primary/10 border-primary/30 text-primary ring-1 ring-primary/20 ring-inset'
              : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-700/60',
            disabled ? 'cursor-default' : 'cursor-pointer',
          ].join(' ')}
        >
          <span className="transition-transform duration-100 group-hover:scale-110 leading-none">
            {EMOJI_MAP[emoji] ?? emoji}
          </span>
          <span>{count}</span>
        </button>
      ))}

      {!disabled && (
        <div className="relative">
          <button
            ref={triggerRef}
            onClick={() => setPickerOpen(p => !p)}
            aria-label={t('comments.reactTitle')}
            className="size-[22px] rounded-full border border-dashed border-zinc-700 bg-transparent text-zinc-500 hover:text-zinc-200 hover:border-zinc-500 flex items-center justify-center transition-colors duration-150"
          >
            <Plus className="size-3" />
          </button>
          {pickerOpen && (
            <ReactionPicker
              myReaction={myReaction}
              onReact={(emoji) => {
                onReact?.(emoji);
                setPickerOpen(false);
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
