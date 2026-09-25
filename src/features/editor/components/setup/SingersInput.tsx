import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';

// Mirror the server limits (project.model.ts MAX_PROJECT_SINGERS / MAX_SINGER_NAME_LENGTH).
const MAX_SINGERS = 20;
const MAX_SINGER_NAME_LENGTH = 60;

/** Appends comma-separated names to `current`: trimmed, capped, deduped case-insensitively. */
function addSingerNames(current: string[], input: string): string[] {
  const next = [...current];
  const seen = new Set(current.map((s) => s.toLowerCase()));
  for (const part of input.split(',')) {
    const name = part.trim().slice(0, MAX_SINGER_NAME_LENGTH);
    if (!name || seen.has(name.toLowerCase())) continue;
    if (next.length >= MAX_SINGERS) break;
    seen.add(name.toLowerCase());
    next.push(name);
  }
  return next;
}

type SingersInputProps = {
  value: string[];
  onChange: (singers: string[]) => void;
  /** Names to offer in the input's autocomplete (e.g. singers already tagged in the lyrics). */
  suggestions?: string[];
};

/**
 * Song-level singer roster editor: type a name, press Enter or "+", remove with the chip's ×.
 * These names are offered as choices when inserting sections / assigning singers.
 */
export default function SingersInput({ value, onChange, suggestions = [] }: SingersInputProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const inputId = useId();
  const listId = `${inputId}-suggestions`;
  const atLimit = value.length >= MAX_SINGERS;
  const pendingSuggestions = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));

  const commit = () => {
    if (!draft.trim()) return;
    onChange(addSingerNames(value, draft));
    setDraft('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // don't submit the surrounding form
      commit();
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        {t('setup.singers')}
      </label>
      <div className="flex flex-wrap items-center gap-1.5 min-h-[40px] p-1.5 bg-zinc-950 border border-zinc-800 rounded-xl focus-within:border-primary/50 transition-colors">
        {value.map((name) => (
          <span
            key={name}
            className="flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-zinc-800 border border-zinc-700/60 text-xs text-zinc-200"
          >
            <span className="max-w-[140px] truncate" title={name}>{name}</span>
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== name))}
              aria-label={t('setup.removeSinger', { name })}
              className="p-0.5 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-600 transition-colors"
            >
              <Icon name="close" size={12} />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={atLimit}
          maxLength={MAX_SINGER_NAME_LENGTH * 4 /* allows a few comma-separated names */}
          list={pendingSuggestions.length > 0 ? listId : undefined}
          placeholder={atLimit ? t('setup.singersLimit', { count: MAX_SINGERS }) : t('setup.singersPlaceholder')}
          className="flex-1 min-w-[120px] h-7 px-1.5 bg-transparent border-none text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none disabled:cursor-not-allowed"
        />
        {pendingSuggestions.length > 0 && (
          <datalist id={listId}>
            {pendingSuggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        )}
        <Button
          type="button"
          variant="sync"
          size="icon-sm"
          onClick={commit}
          disabled={atLimit || !draft.trim()}
          aria-label={t('setup.addSinger')}
          title={t('setup.addSinger')}
        >
          <Icon name="add" size={16} />
        </Button>
      </div>
      <p className="text-[11px] text-zinc-500">{t('setup.singersHint')}</p>
    </div>
  );
}
