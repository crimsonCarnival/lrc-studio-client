import { useTranslation } from 'react-i18next';
import { Section, SettingRow, ShortcutInput } from '../../shared';
import { Eye, Music2, Languages } from 'lucide-react';

export default function PreviewShortcuts({ settings, searchTerm, handleShortcutChange, validateShortcut, conflictMap }) {
  const { t } = useTranslation();

  return (
    <Section title={t('settings.shortcuts.previewSection') || 'Preview'} icon={Eye} searchTerm={searchTerm}>
      <SettingRow
        icon={Eye}
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
        icon={Music2}
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
        icon={Languages}
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
