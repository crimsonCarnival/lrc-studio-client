import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { LogoLoader } from '@ui/LogoLoader';

type UnsavedChangesBarProps = {
  saving: boolean;
  saveDisabled?: boolean;
  onSave: () => void;
  onDiscard: () => void;
};

/**
 * Floating pill for panels that stage edits and commit them together. Only the settings
 * panels use it, a page where the phone bottom bar shows, so below lg it floats above the bar.
 */
export default function UnsavedChangesBar({ saving, saveDisabled = false, onSave, onDiscard }: UnsavedChangesBarProps) {
  const { t } = useTranslation();
  return createPortal(
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-5 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
      <div className="flex items-center gap-2 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/60 rounded-2xl shadow-2xl px-4 py-2.5 pointer-events-auto animate-slide-up-fade">
        <span className="text-xs text-zinc-400 mr-1">
          <span className="font-semibold text-zinc-200">{t('settings.unsavedChanges')}</span>
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          disabled={saving}
          className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 h-8 coarse:h-11 px-3 rounded-lg text-xs"
        >
          {t('common.discard')}
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={saving || saveDisabled}
          className="bg-primary hover:bg-primary-dim text-zinc-950 font-semibold rounded-lg h-8 coarse:h-11 px-4 text-xs gap-1.5"
        >
          {saving && <LogoLoader size={12} />}
          {t('profile.save')}
        </Button>
      </div>
    </div>,
    document.body
  );
}
