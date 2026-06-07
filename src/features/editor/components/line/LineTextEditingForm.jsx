import { useTranslation } from 'react-i18next';
import { Input } from '@ui/input';
import { FloatingCombobox } from '@ui/floating-combobox';
import { useLanguageOptions } from '@features/editor/hooks/useLanguageOptions';
import { Tip } from '@ui/tip';
import { Plus, X, User } from 'lucide-react';

/** Style class per singer role (0-indexed) */
const SINGER_STYLE_CLASSES = [
  '',               // 0: normal
  'italic',         // 1: italic
  'font-bold',      // 2: bold
  'font-bold italic', // 3: bold+italic
];

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
  ref,
}) {
  const { t } = useTranslation();
  const languageOptions = useLanguageOptions();

  // Ensure we always work with a 4-slot array (padded with '')
  const singers = [...(editingSingers || []), '', '', '', ''].slice(0, 4);

  const save = () =>
    handleSaveLineText(lineIndex, editingText, editingSecondary, editingTranslations, singers);

  const updateSinger = (idx, val) => {
    setEditingSingers((prev) => {
      const next = [...(prev || []), '', '', '', ''].slice(0, 4);
      next[idx] = val;
      return next;
    });
  };

  const removeSinger = (idx) => {
    setEditingSingers((prev) => {
      const next = [...(prev || []), '', '', '', ''].slice(0, 4);
      next[idx] = '';
      // Collapse: shift remaining non-empty singers forward
      const filled = next.filter(Boolean);
      return [...filled, '', '', '', ''].slice(0, 4);
    });
  };

  const updateTranslation = (idx, field, value) => {
    setEditingTranslations((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addTranslation = () => {
    setEditingTranslations((prev) => [...prev, { text: '', language: '' }]);
  };

  const removeTranslation = (idx) => {
    setEditingTranslations((prev) => prev.filter((_, i) => i !== idx));
  };

  // How many singer slots are actively filled
  const activeSingerCount = singers.filter(Boolean).length;
  // Next empty slot index (or -1 if all 4 filled)
  const nextEmptySlot = singers.findIndex((s) => !s);

  return (
    <div
      role="group"
      className="flex flex-col gap-1 w-full"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          save();
          setEditingLineIndex(null);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          save();
          setEditingLineIndex(null);
        } else if (e.key === 'Escape') {
          setEditingLineIndex(null);
        }
      }}
    >
      <Input
        type="text"
        ref={ref}
        value={editingText}
        onChange={(e) => setEditingText(e.target.value)}
        placeholder={`${t('editor.primaryText')} — {漢字|よみかた}`}
        className="w-full bg-zinc-800 border-primary/50 text-xs text-zinc-100 h-7"
      />
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

      {/* Singer slots — dynamic, up to 4 */}
      <div className="flex flex-col gap-0.5 mt-0.5">
        {singers.map((name, idx) => {
          // Only show a row if this slot is filled OR it's the next empty slot after filled ones
          const isFilled = !!name;
          const isNextEmpty = idx === nextEmptySlot;
          if (!isFilled && !isNextEmpty) return null;

          const roleLabel = idx === 0
            ? t('editor.singer', 'Singer 1')
            : t('editor.singerN', 'Singer {{n}}', { n: idx + 1 });

          return (
            <div key={idx} className="flex items-center gap-1">
              <User className="size-3 text-zinc-600 shrink-0" />
              <Input
                type="text"
                value={name}
                onChange={(e) => updateSinger(idx, e.target.value)}
                placeholder={roleLabel}
                list={`singers-${lineIndex}`}
                className={`flex-1 bg-zinc-800 border-zinc-700/40 text-xs text-zinc-500 h-6 ${SINGER_STYLE_CLASSES[idx]}`}
              />
              {isFilled && (
                <Tip content={t('editor.removeSinger', 'Remove singer')}>
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
        {songArtists?.length > 0 && (
          <datalist id={`singers-${lineIndex}`}>
            {songArtists.map((a) => <option key={a} value={a} />)}
          </datalist>
        )}
        {activeSingerCount >= 4 && (
          <p className="text-[9px] text-zinc-700 ml-4">Max 4 singers</p>
        )}
      </div>
    </div>
  );
}

export default LineTextEditingForm;
