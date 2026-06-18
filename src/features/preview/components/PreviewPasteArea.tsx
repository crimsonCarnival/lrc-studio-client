import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Textarea } from '@ui/textarea';

interface PreviewPasteAreaProps {
  pastingType: string | null;
  setPastingType: (v: string | null) => void;
  pasteText: string;
  setPasteText: (v: string) => void;
  handleSavePaste: () => void;
}

export default function PreviewPasteArea({
  pastingType,
  setPastingType,
  pasteText,
  setPasteText,
  handleSavePaste
}: PreviewPasteAreaProps) {
  const { t } = useTranslation();

  if (!pastingType) return null;

  return (
    <div className="flex-1 flex flex-col gap-2 sm:gap-3 min-h-0 animate-fade-in overflow-hidden">
      <div className="flex items-center justify-between bg-zinc-800/40 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
        <span className="text-xs sm:text-sm font-medium text-primary">
          {t('common.paste')} {pastingType === 'secondary' ? t('preview.secondaryLyrics') : pastingType === 'furigana' ? t('preview.furigana') : t('preview.translation')} {t('preview.lyricsHeader')}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPastingType(null)}
          className="text-zinc-500 hover:text-zinc-300 hover:bg-transparent h-auto p-0"
        >
          {t('confirm.cancel')}
        </Button>
      </div>
      <p className="text-xs text-zinc-500">
        {t('preview.pasteInstruction')}
      </p>
      <Textarea
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        className="flex-1 bg-zinc-900/50 border-zinc-700/50 text-zinc-200 placeholder:text-zinc-600 resize-none font-mono leading-relaxed focus:border-primary/50 min-h-0"
        placeholder={t('preview.pastePlaceholder')}
      />
      <Button
        onClick={handleSavePaste}
        className="w-full py-2 sm:py-3 bg-primary hover:bg-primary-dim text-zinc-950 font-semibold rounded-lg sm:rounded-xl shadow-lg h-auto text-sm"
      >
        {t('preview.saveTracks')}
      </Button>
    </div>
  );
}
