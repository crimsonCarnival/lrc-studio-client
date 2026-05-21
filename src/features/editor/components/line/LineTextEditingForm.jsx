import { useTranslation } from 'react-i18next';
import { Input } from '@ui/input';

function LineTextEditingForm({
  lineIndex,
  editingText,
  setEditingText,
  editingSecondary,
  setEditingSecondary,
  editingTranslation,
  setEditingTranslation,
  handleSaveLineText,
  setEditingLineIndex,
  ref,
}) {
  const { t } = useTranslation();

  return (
    <div
      role="group"
      className="flex flex-col gap-1 w-full"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          handleSaveLineText(lineIndex, editingText, editingSecondary, editingTranslation);
          setEditingLineIndex(null);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleSaveLineText(lineIndex, editingText, editingSecondary, editingTranslation);
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
      <Input
        type="text"
        value={editingTranslation}
        onChange={(e) => setEditingTranslation(e.target.value)}
        placeholder={t('editor.translationText')}
        className="w-full bg-zinc-800 border-zinc-600/50 text-xs text-zinc-500 h-6 italic"
      />
    </div>
  );
}

export default LineTextEditingForm;
