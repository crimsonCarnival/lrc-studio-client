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
      dialogProps={{ className: 'max-w-3xl w-[94vw] max-h-[85vh] overflow-y-auto' }}
    >
      {/* Mounted per open so the editor never carries a stale draft into the next visit. */}
      {open && <ThemeSelector settings={settings} updateSetting={updateSetting} />}
    </ResponsiveModal>
  );
}
