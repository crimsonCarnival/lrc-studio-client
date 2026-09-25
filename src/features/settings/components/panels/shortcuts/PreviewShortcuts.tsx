import { useTranslation } from 'react-i18next';
import { Section, SettingRow, ShortcutInput } from '../../shared';

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
    <Section title={t('settings.shortcuts.previewSection')} iconName="visibility" searchTerm={searchTerm}>
      <SettingRow
        iconName="visibility"
        label={t('settings.shortcuts.toggleTranslationLabel')}
        description={t('settings.shortcuts.toggleTranslationDesc')}
      >
        <ShortcutInput
          value={settings.shortcuts?.toggleTranslation?.[0] || 't'}
          onChange={handleShortcutChange('toggleTranslation')}
          onValidate={(v) => validateShortcut(v, 'toggleTranslation')}
          conflict={conflictMap['toggleTranslation']}
        />
      </SettingRow>
      <SettingRow
        iconName="music_note"
        label={t('settings.shortcuts.addSecondaryLabel')}
        description={t('settings.shortcuts.addSecondaryDesc')}
      >
        <ShortcutInput
          value={settings.shortcuts?.addSecondary?.[0] || 'Shift+H'}
          onChange={handleShortcutChange('addSecondary')}
          onValidate={(v) => validateShortcut(v, 'addSecondary')}
          conflict={conflictMap['addSecondary']}
        />
      </SettingRow>
      <SettingRow
        iconName="translate"
        label={t('settings.shortcuts.addTranslationLabel')}
        description={t('settings.shortcuts.addTranslationDesc')}
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
