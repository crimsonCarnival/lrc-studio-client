import { useTranslation } from 'react-i18next';
import { Input } from '@ui/input';
import { Plus, X, User } from 'lucide-react';

function LineTextEditingForm({
  lineIndex,
  editingText,
  setEditingText,
  editingSecondary,
  setEditingSecondary,
  editingTranslations,
  setEditingTranslations,
  editingSinger,
  setEditingSinger,
  handleSaveLineText,
  setEditingLineIndex,
  songArtists,
  ref,
}) {
  const { t } = useTranslation();

  const save = () => handleSaveLineText(lineIndex, editingText, editingSecondary, editingTranslations, editingSinger);

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
          <Input
            type="text"
            value={tr.language || ''}
            onChange={(e) => updateTranslation(idx, 'language', e.target.value)}
            placeholder="Lang"
            className="w-16 shrink-0 bg-zinc-800 border-zinc-600/50 text-[10px] text-zinc-500 h-6 px-1.5"
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
        <Plus className="size-2.5" /> {t('editor.addTranslation', 'Add translation')}
      </button>

      {/* Singer field */}
      <div className="flex items-center gap-1 mt-0.5">
        <User className="size-3 text-zinc-600 shrink-0" />
        <Input
          type="text"
          value={editingSinger}
          onChange={(e) => setEditingSinger(e.target.value)}
          placeholder={t('editor.singer', 'Singer (optional)')}
          list={`singers-${lineIndex}`}
          className="flex-1 bg-zinc-800 border-zinc-700/40 text-xs text-zinc-500 h-6"
        />
        {songArtists?.length > 0 && (
          <datalist id={`singers-${lineIndex}`}>
            {songArtists.map((a) => <option key={a} value={a} />)}
          </datalist>
        )}
      </div>
    </div>
  );
}

export default LineTextEditingForm;
