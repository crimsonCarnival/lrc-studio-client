import type { Dispatch, SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import { BookOpen } from 'lucide-react';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';

// Compact overlay controls for the public viewer stage: furigana + translation.
// Each renders only when applicable.
interface StageControlsProps {
  t: TFunction;
  hasFurigana?: boolean;
  hasTranslations?: boolean;
  showFurigana?: boolean;
  setShowFurigana: Dispatch<SetStateAction<boolean>>;
  showTranslations?: boolean;
  setShowTranslations: Dispatch<SetStateAction<boolean>>;
}

export default function StageControls({
  t,
  hasFurigana,
  hasTranslations,
  showFurigana,
  setShowFurigana,
  showTranslations,
  setShowTranslations,
}: StageControlsProps) {
  if (!hasFurigana && !hasTranslations) return null;
  return (
    <div className="absolute top-2 right-2 z-overlay flex items-center gap-1">
      {hasFurigana && (
        <Tip content={t('preview.furigana')}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFurigana((v) => !v)}
            className={`size-8 backdrop-blur-md transition-colors ${showFurigana ? 'text-primary bg-primary/15' : 'text-muted-foreground hover:text-foreground bg-background/40'}`}
          >
            <BookOpen className="size-4" strokeWidth={1.8} />
          </Button>
        </Tip>
      )}
      {hasTranslations && (
        <Tip content={t('preview.toggleTranslations')}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowTranslations((v) => !v)}
            className={`size-8 backdrop-blur-md transition-colors ${showTranslations ? 'text-primary bg-primary/15' : 'text-muted-foreground hover:text-foreground bg-background/40'}`}
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          </Button>
        </Tip>
      )}
    </div>
  );
}
