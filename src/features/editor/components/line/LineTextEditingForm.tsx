import type { Dispatch, FocusEvent, KeyboardEvent, Ref, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@ui/input';
import { FloatingCombobox } from '@ui/floating-combobox';
import { useLanguageOptions } from '@features/editor/hooks/useLanguageOptions';
import { Tip } from '@ui/tip';
import { Plus, X, User, Scissors } from 'lucide-react';

interface Translation {
  text?: string;
  language?: string;
}

/** Style class per singer role (0-indexed) */
const SINGER_STYLE_CLASSES = [
  '',               // 0: normal
  'italic',         // 1: italic
  'font-bold',      // 2: bold
  'font-bold italic', // 3: bold+italic
];

/**
 * Try to parse "Name: Lyric text" from editingText.
 * Returns { name, text } if colon found at start (not mid-sentence), else null.
 */
function tryParseSingerPrefix(text: string): { name: string; text: string } | null {
  const colonIdx = text.indexOf(':');
  if (colonIdx <= 0 || colonIdx > 30) return null; // only short prefixes
  const prefix = text.slice(0, colonIdx).trim();
  const rest = text.slice(colonIdx + 1).trim();
  // prefix should look like a name (no lowercase leading words like "e.g.")
  if (!prefix || !rest || /\s{2,}/.test(prefix)) return null;
  return { name: prefix, text: rest };
}

interface LineTextEditingFormProps {
  lineIndex: number;
  editingText: string;
  setEditingText: (v: string) => void;
  editingSecondary: string;
  setEditingSecondary: (v: string) => void;
  editingTranslations: Translation[];
  setEditingTranslations: Dispatch<SetStateAction<Translation[]>>;
  editingSingers: string[];
  setEditingSingers: Dispatch<SetStateAction<string[]>>;
  handleSaveLineText: (
    lineIndex: number,
    text: string,
    secondary: string,
    translations: Translation[],
    singers: string[]
  ) => void;
  setEditingLineIndex: (v: number | null) => void;
  songArtists?: string[];
  projectSingers?: string[];
  ref?: Ref<HTMLInputElement>;
}

function LineTextEditingForm({
  lineIndex,
  editingText,
  setEditingText,
  editingSecondary,
  setEditingSecondary,
  editingTranslations,
  setEditingTranslations,
  editingSingers,
  setEditingSingers,
  handleSaveLineText,
  setEditingLineIndex,
  songArtists,
  projectSingers,
  ref,
}: LineTextEditingFormProps) {
  const { t } = useTranslation();
  // Some keys use default-value/interpolation forms; bypass strict key checking.
  const tk = t as (key: string, defaultValue?: string, options?: Record<string, unknown>) => string;
  const languageOptions = useLanguageOptions();

  // Combined autocomplete options: project singers + song artists, deduped
  const singerOptions = [...new Set([...(projectSingers || []), ...(songArtists || [])])].filter(Boolean).map(s => ({ value: s }));

  // Ensure we always work with a 4-slot array (padded with '')
  const singers = [...(editingSingers || []), '', '', '', ''].slice(0, 4);

  const save = () =>
    handleSaveLineText(lineIndex, editingText, editingSecondary, editingTranslations, singers);

  const updateSinger = (idx: number, val: string) => {
    setEditingSingers((prev) => {
      const next = [...(prev || []), '', '', '', ''].slice(0, 4);
      next[idx] = val;
      return next;
    });
  };

  const removeSinger = (idx: number) => {
    setEditingSingers((prev) => {
      const next = [...(prev || []), '', '', '', ''].slice(0, 4);
      next[idx] = '';
      // Collapse: shift remaining non-empty singers forward
      const filled = next.filter(Boolean);
      return [...filled, '', '', '', ''].slice(0, 4);
    });
  };

  const updateTranslation = (idx: number, field: keyof Translation, value: string) => {
    setEditingTranslations((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addTranslation = () => {
    setEditingTranslations((prev) => [...prev, { text: '', language: '' }]);
  };

  const removeTranslation = (idx: number) => {
    setEditingTranslations((prev) => prev.filter((_, i) => i !== idx));
  };

  // Split "Name: lyric text" into singer + text
  const handleSplitAtColon = () => {
    const parsed = tryParseSingerPrefix(editingText);
    if (!parsed) return;
    setEditingText(parsed.text);
    setEditingSingers((prev) => {
      const next = [...(prev || []), '', '', '', ''].slice(0, 4);
      if (!next[0]) {
        next[0] = parsed.name;
      } else if (!next[1]) {
        next[1] = parsed.name;
      }
      return next;
    });
  };

  // How many singer slots are actively filled
  const activeSingerCount = singers.filter(Boolean).length;
  // Next empty slot index (or -1 if all 4 filled)
  const nextEmptySlot = singers.findIndex((s) => !s);

  const splitParsed = tryParseSingerPrefix(editingText);

  return (
    <div
      role="group"
      className="flex flex-col gap-1 w-full"
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          save();
          setEditingLineIndex(null);
        }
      }}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          save();
          setEditingLineIndex(null);
        } else if (e.key === 'Escape') {
          setEditingLineIndex(null);
        }
      }}
    >
      <div className="flex items-center gap-1">
        <Input
          type="text"
          ref={ref}
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          placeholder={`${t('editor.primaryText')} — {漢字|よみかた}`}
          className="w-full bg-zinc-800 border-primary/50 text-xs text-zinc-100 h-7"
        />
        {splitParsed && (
          <Tip content={tk('editor.splitAtColon', 'Split "{{name}}" as singer', { name: splitParsed.name })}>
            <button
              type="button"
              onClick={handleSplitAtColon}
              className="shrink-0 text-zinc-500 hover:text-primary px-1"
            >
              <Scissors className="size-3" />
            </button>
          </Tip>
        )}
      </div>
      <Input
        type="text"
        value={editingSecondary}
        onChange={(e) => setEditingSecondary(e.target.value)}
        placeholder={t('editor.secondaryText')}
        className="w-full bg-zinc-800 border-zinc-600/50 text-xs text-zinc-400 h-6"
      />

      {/* Translation slots */}
      {editingTranslations.map((tr, idx) => (
        <div key={idx} className="flex items-center gap-1">
          <FloatingCombobox
            label=""
            value={tr.language || ''}
            onChange={(v) => updateTranslation(idx, 'language', v)}
            options={languageOptions}
            strict
            size="sm"
            placeholder={t('editor.langPlaceholder')}
            className="w-24 shrink-0"
          />
          <Input
            type="text"
            value={tr.text || ''}
            onChange={(e) => updateTranslation(idx, 'text', e.target.value)}
            placeholder={t('editor.translationText')}
            className="flex-1 bg-zinc-800 border-zinc-600/50 text-xs text-zinc-500 h-6 italic"
          />
          <button type="button" onClick={() => removeTranslation(idx)} className="text-zinc-600 hover:text-zinc-400 shrink-0 px-0.5">
            <X className="size-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addTranslation}
        className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 self-start px-0.5 py-0.5"
      >
        <Plus className="size-2.5" /> {t('editor.addTranslation')}
      </button>

      {/* Singer slots — dynamic, up to 4 — now using FloatingCombobox */}
      <div className="flex flex-col gap-0.5 mt-0.5">
        {singers.map((name, idx) => {
          // Only show a row if this slot is filled OR it's the next empty slot after filled ones
          const isFilled = !!name;
          const isNextEmpty = idx === nextEmptySlot;
          if (!isFilled && !isNextEmpty) return null;

          const roleLabel = idx === 0
            ? t('editor.singer')
            : tk('editor.singerN', 'Singer {{n}}', { n: idx + 1 });

          return (
            <div key={idx} className="flex items-center gap-1">
              <User className="size-3 text-zinc-600 shrink-0" />
              <FloatingCombobox
                label=""
                value={name}
                onChange={(v) => updateSinger(idx, v)}
                options={singerOptions}
                size="sm"
                placeholder={roleLabel}
                className={`flex-1 text-xs text-zinc-500 h-6 ${SINGER_STYLE_CLASSES[idx]}`}
              />
              {isFilled && (
                <Tip content={t('editor.removeSinger')}>
                  <button
                    type="button"
                    onClick={() => removeSinger(idx)}
                    className="text-zinc-700 hover:text-zinc-400 shrink-0 px-0.5"
                  >
                    <X className="size-3" />
                  </button>
                </Tip>
              )}
            </div>
          );
        })}
        {activeSingerCount >= 4 && (
          <p className="text-[9px] text-zinc-700 ml-4">{t('editor.maxSingers')}</p>
        )}
      </div>
    </div>
  );
}

export default LineTextEditingForm;
