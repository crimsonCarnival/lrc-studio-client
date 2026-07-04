import { useTranslation } from 'react-i18next';
import { Section, SettingRow, ShortcutInput } from '../../shared';
import { Icon } from '@/shared/ui/Icon';

const EyeIcon = ({ className }: { className?: string }) => <Icon name="visibility" className={className} />;
const Music2Icon = ({ className }: { className?: string }) => <Icon name="music_note" className={className} />;
const LanguagesIcon = ({ className }: { className?: string }) => <Icon name="translate" className={className} />;

interface PreviewShortcutsProps {
  settings: { shortcuts?: Record<string, string[] | undefined> };
  searchTerm?: string;
  handleShortcutChange: (key: string) => (value: string) => void;
  validateShortcut: (value: string, key: string) => boolean;
  conflictMap: Record<string, string>;
}

export default function PreviewShortcuts({ settings, searchTerm, handleShortcutChange, validateShortcut, conflictMap }: PreviewShortcutsProps) {
  const { t } = useTranslation();

  return (
    <Section title={t('settings.shortcuts.previewSection') || 'Preview'} icon={EyeIcon} searchTerm={searchTerm}>
      <SettingRow
        icon={EyeIcon}
        label={t('settings.shortcuts.toggleTranslationLabel') || 'Toggle Translations'}
        description={t('settings.shortcuts.toggleTranslationDesc') || 'Show or hide translations in preview'}
      >
        <ShortcutInput
          value={settings.shortcuts?.toggleTranslation?.[0] || 't'}
          onChange={handleShortcutChange('toggleTranslation')}
          onValidate={(v) => validateShortcut(v, 'toggleTranslation')}
          conflict={conflictMap['toggleTranslation']}
        />
      </SettingRow>
      <SettingRow
        icon={Music2Icon}
        label={t('settings.shortcuts.addSecondaryLabel') || 'Add Secondary Lyrics'}
        description={t('settings.shortcuts.addSecondaryDesc') || 'Open secondary lyrics paste panel'}
      >
        <ShortcutInput
          value={settings.shortcuts?.addSecondary?.[0] || 'Shift+H'}
          onChange={handleShortcutChange('addSecondary')}
          onValidate={(v) => validateShortcut(v, 'addSecondary')}
          conflict={conflictMap['addSecondary']}
        />
      </SettingRow>
      <SettingRow
        icon={LanguagesIcon}
        label={t('settings.shortcuts.addTranslationLabel') || 'Add Translations'}
        description={t('settings.shortcuts.addTranslationDesc') || 'Open translation paste panel'}
      >
        <ShortcutInput
          value={settings.shortcuts?.addTranslation?.[0] || 'Shift+T'}
          onChange={handleShortcutChange('addTranslation')}
          onValidate={(v) => validateShortcut(v, 'addTranslation')}
          conflict={conflictMap['addTranslation']}
        />
      </SettingRow>
    </Section>
  );
}
