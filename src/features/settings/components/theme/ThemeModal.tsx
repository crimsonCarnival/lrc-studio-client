import { useTranslation } from 'react-i18next';
import ResponsiveModal from '@/shared/ui/ResponsiveModal';
import ThemeSelector from './ThemeSelector';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: { interface?: { theme?: string; customTheme?: string } };
  updateSetting: (path: string, value: unknown) => void;
};

/** The theme selector in a dialog, for the header menus. The settings page renders ThemeSelector inline. */
export default function ThemeModal({ open, onOpenChange, settings, updateSetting }: Props) {
  const { t } = useTranslation();
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('settings.interface.theme')}
      description={t('settings.themeEditor.description')}
      // Flex column capped to the viewport: the title stays put and only the body scrolls.
      dialogProps={{ className: 'max-w-5xl w-[94vw] max-h-[85dvh] flex flex-col gap-0 overflow-hidden' }}
    >
      {/* Mounted per open so the editor never carries a stale draft into the next visit. */}
      {open && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ThemeSelector settings={settings} updateSetting={updateSetting} />
        </div>
      )}
    </ResponsiveModal>
  );
}
