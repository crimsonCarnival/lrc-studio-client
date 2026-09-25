import { useTranslation } from 'react-i18next';
import { Section, SettingRow, ShortcutInput, ModifierInput } from '../../shared';
import NumberInput from '@shared/ui/NumberInput';

interface EditorShortcutsProps {
  settings: {
    shortcuts?: Record<string, string[] | undefined>;
    editor?: { nudge?: { default?: number }; shiftAllAmount?: number };
  };
  searchTerm?: string;
  handleShortcutChange: (key: string) => (value: string) => void;
  validateShortcut: (value: string, key: string) => boolean;
  conflictMap: Record<string, string>;
  updateSetting: (path: string, value: unknown) => void;
}

export default function EditorShortcuts({ settings, searchTerm, handleShortcutChange, validateShortcut, conflictMap, updateSetting }: EditorShortcutsProps) {
  const { t } = useTranslation();

  return (
    <Section title={t('settings.shortcuts.label')} iconName="keyboard" searchTerm={searchTerm}>
      <SettingRow
        iconName="location_on"
        label={t('settings.shortcuts.markLabel')}
        description={t('settings.shortcuts.markDesc')}
      >
        <ShortcutInput
          value={settings.shortcuts?.mark?.[0] || 'Enter'}
          onChange={handleShortcutChange('mark')}
          onValidate={(v) => validateShortcut(v, 'mark')}
          conflict={conflictMap['mark']}
        />
      </SettingRow>
      <SettingRow
        iconName="chevron_left"
        label={t('settings.shortcuts.nudgeLeftLabel')}
        description={
          t('settings.shortcuts.nudgeLeftDesc', { val: settings.editor?.nudge?.default || 0.1 })
        }
      >
        <ShortcutInput
          value={settings.shortcuts?.nudgeLeft?.[0] || 'Alt+ArrowLeft'}
          onChange={handleShortcutChange('nudgeLeft')}
          onValidate={(v) => validateShortcut(v, 'nudgeLeft')}
          conflict={conflictMap['nudgeLeft']}
        />
      </SettingRow>
      <SettingRow
        iconName="chevron_right"
        label={t('settings.shortcuts.nudgeRightLabel')}
        description={
          t('settings.shortcuts.nudgeRightDesc', { val: settings.editor?.nudge?.default || 0.1 })
        }
      >
        <ShortcutInput
          value={settings.shortcuts?.nudgeRight?.[0] || 'Alt+ArrowRight'}
          onChange={handleShortcutChange('nudgeRight')}
          onValidate={(v) => validateShortcut(v, 'nudgeRight')}
          conflict={conflictMap['nudgeRight']}
        />
      </SettingRow>
      <SettingRow
        iconName="add"
        label={t('settings.shortcuts.addLineLabel')}
        description={t('settings.shortcuts.addLineDesc')}
      >
        <ShortcutInput
          value={settings.shortcuts?.addLine?.[0] || 'Ctrl+Enter'}
          onChange={handleShortcutChange('addLine')}
          onValidate={(v) => validateShortcut(v, 'addLine')}
          conflict={conflictMap['addLine']}
        />
      </SettingRow>
      <SettingRow
        iconName="delete"
        label={t('settings.shortcuts.deleteLineLabel')}
        description={t('settings.shortcuts.deleteLineDesc')}
      >
        <ShortcutInput
          value={settings.shortcuts?.deleteLine?.[0] || 'Delete'}
          onChange={handleShortcutChange('deleteLine')}
          onValidate={(v) => validateShortcut(v, 'deleteLine')}
          conflict={conflictMap['deleteLine']}
        />
      </SettingRow>
      <SettingRow
        iconName="ink_eraser"
        label={t('settings.shortcuts.clearTimestampLabel')}
        description={t('settings.shortcuts.clearTimestampDesc')}
      >
        <ShortcutInput
          value={settings.shortcuts?.clearTimestamp?.[0] || 'Backspace'}
          onChange={handleShortcutChange('clearTimestamp')}
          onValidate={(v) => validateShortcut(v, 'clearTimestamp')}
          conflict={conflictMap['clearTimestamp']}
        />
      </SettingRow>
      <SettingRow
        iconName="refresh"
        label={t('settings.shortcuts.switchModeLabel')}
        description={t('settings.shortcuts.switchModeDesc')}
      >
        <ShortcutInput
          value={settings.shortcuts?.switchMode?.[0] || 'Ctrl+M'}
          onChange={handleShortcutChange('switchMode')}
          onValidate={(v) => validateShortcut(v, 'switchMode')}
          conflict={conflictMap['switchMode']}
        />
      </SettingRow>
      <SettingRow
        iconName="logout"
        label={t('settings.shortcuts.deselectLabel')}
        description={t('settings.shortcuts.deselectDesc')}
      >
        <ShortcutInput
          value={settings.shortcuts?.deselect?.[0] || 'Escape'}
          onChange={handleShortcutChange('deselect')}
          onValidate={(v) => validateShortcut(v, 'deselect')}
          conflict={conflictMap['deselect']}
        />
      </SettingRow>
      <SettingRow
        iconName="help"
        label={t('settings.shortcuts.showHelpLabel')}
        description={t('settings.shortcuts.showHelpDesc')}
      >
        <ShortcutInput
          value={settings.shortcuts?.showHelp?.[0] || '?'}
          onChange={handleShortcutChange('showHelp')}
          onValidate={(v) => validateShortcut(v, 'showHelp')}
          conflict={conflictMap['showHelp']}
        />
      </SettingRow>
      <SettingRow
        iconName="swap_horiz"
        label={t('settings.editor.shiftAllAmount')}
        description={t('settings.editor.shiftAllAmountDesc')}
      >
        <NumberInput
          min={0.01}
          max={60}
          step={0.1}
          value={settings.editor?.shiftAllAmount ?? 0.5}
          onChange={(e) => updateSetting('editor.shiftAllAmount', Math.max(0.01, parseFloat(e.target.value) || 0.5))}
          className="w-20"
        />
      </SettingRow>
      <SettingRow
        iconName="arrow_selector_tool"
        label={t('settings.shortcuts.rangeSelectLabel')}
        description={t('settings.shortcuts.rangeSelectDesc')}
      >
        <ModifierInput
          value={settings.shortcuts?.rangeSelect?.[0] || 'Shift'}
          onChange={handleShortcutChange('rangeSelect')}
          validateModifier={(v) => v !== (settings.shortcuts?.toggleSelect?.[0] || 'Ctrl')}
        />
      </SettingRow>
      <SettingRow
        iconName="touch_app"
        label={t('settings.shortcuts.toggleSelectLabel')}
        description={t('settings.shortcuts.toggleSelectDesc')}
      >
        <ModifierInput
          value={settings.shortcuts?.toggleSelect?.[0] || 'Ctrl'}
          onChange={handleShortcutChange('toggleSelect')}
          validateModifier={(v) => v !== (settings.shortcuts?.rangeSelect?.[0] || 'Shift')}
        />
      </SettingRow>
    </Section>
  );
}
