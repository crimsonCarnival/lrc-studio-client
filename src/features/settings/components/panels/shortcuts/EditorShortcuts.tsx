import { useTranslation } from 'react-i18next';
import { Section, SettingRow, ShortcutInput, ModifierInput } from '../../shared';
import NumberInput from '@shared/ui/NumberInput';
import {
  MapPin, ChevronLeft, ChevronRight, Plus, Trash2, Eraser, RefreshCw, LogOut, HelpCircle,
  MousePointer, MousePointerClick, Keyboard, MoveHorizontal
} from 'lucide-react';

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
    <Section title={t('settings.shortcuts.label') || 'Editor'} icon={Keyboard} searchTerm={searchTerm}>
      <SettingRow
        icon={MapPin}
        label={t('settings.shortcuts.markLabel') || 'Mark Timestamp'}
        description={t('settings.shortcuts.markDesc') || 'Key to mark start/end times'}
      >
        <ShortcutInput
          value={settings.shortcuts?.mark?.[0] || 'Space'}
          onChange={handleShortcutChange('mark')}
          onValidate={(v) => validateShortcut(v, 'mark')}
          conflict={conflictMap['mark']}
        />
      </SettingRow>
      <SettingRow
        icon={ChevronLeft}
        label={t('settings.shortcuts.nudgeLeftLabel') || 'Nudge Left'}
        description={
          t('settings.shortcuts.nudgeLeftDesc', { val: settings.editor?.nudge?.default || 0.1 }) ||
          `Subtract ${settings.editor?.nudge?.default || 0.1}s`
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
        icon={ChevronRight}
        label={t('settings.shortcuts.nudgeRightLabel') || 'Nudge Right'}
        description={
          t('settings.shortcuts.nudgeRightDesc', { val: settings.editor?.nudge?.default || 0.1 }) ||
          `Add ${settings.editor?.nudge?.default || 0.1}s`
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
        icon={Plus}
        label={t('settings.shortcuts.addLineLabel') || 'Add Line'}
        description={t('settings.shortcuts.addLineDesc') || 'Add new line below active line'}
      >
        <ShortcutInput
          value={settings.shortcuts?.addLine?.[0] || 'Ctrl+Enter'}
          onChange={handleShortcutChange('addLine')}
          onValidate={(v) => validateShortcut(v, 'addLine')}
          conflict={conflictMap['addLine']}
        />
      </SettingRow>
      <SettingRow
        icon={Trash2}
        label={t('settings.shortcuts.deleteLineLabel') || 'Delete Line'}
        description={t('settings.shortcuts.deleteLineDesc') || 'Delete active line (or selection)'}
      >
        <ShortcutInput
          value={settings.shortcuts?.deleteLine?.[0] || 'Delete'}
          onChange={handleShortcutChange('deleteLine')}
          onValidate={(v) => validateShortcut(v, 'deleteLine')}
          conflict={conflictMap['deleteLine']}
        />
      </SettingRow>
      <SettingRow
        icon={Eraser}
        label={t('settings.shortcuts.clearTimestampLabel') || 'Clear Timestamp'}
        description={t('settings.shortcuts.clearTimestampDesc') || 'Clear timestamp on active line'}
      >
        <ShortcutInput
          value={settings.shortcuts?.clearTimestamp?.[0] || 'Backspace'}
          onChange={handleShortcutChange('clearTimestamp')}
          onValidate={(v) => validateShortcut(v, 'clearTimestamp')}
          conflict={conflictMap['clearTimestamp']}
        />
      </SettingRow>
      <SettingRow
        icon={RefreshCw}
        label={t('settings.shortcuts.switchModeLabel') || 'Switch Mode'}
        description={t('settings.shortcuts.switchModeDesc') || 'Toggle LRC/SRT editor mode'}
      >
        <ShortcutInput
          value={settings.shortcuts?.switchMode?.[0] || 'Ctrl+M'}
          onChange={handleShortcutChange('switchMode')}
          onValidate={(v) => validateShortcut(v, 'switchMode')}
          conflict={conflictMap['switchMode']}
        />
      </SettingRow>
      <SettingRow
        icon={LogOut}
        label={t('settings.shortcuts.deselectLabel') || 'Deselect / Close'}
        description={t('settings.shortcuts.deselectDesc') || 'Clear selection or close dialogs'}
      >
        <ShortcutInput
          value={settings.shortcuts?.deselect?.[0] || 'Escape'}
          onChange={handleShortcutChange('deselect')}
          onValidate={(v) => validateShortcut(v, 'deselect')}
          conflict={conflictMap['deselect']}
        />
      </SettingRow>
      <SettingRow
        icon={HelpCircle}
        label={t('settings.shortcuts.showHelpLabel') || 'Show Shortcuts'}
        description={t('settings.shortcuts.showHelpDesc') || 'Open the keyboard shortcuts dialog'}
      >
        <ShortcutInput
          value={settings.shortcuts?.showHelp?.[0] || '?'}
          onChange={handleShortcutChange('showHelp')}
          onValidate={(v) => validateShortcut(v, 'showHelp')}
          conflict={conflictMap['showHelp']}
        />
      </SettingRow>
      <SettingRow
        icon={MoveHorizontal}
        label={t('settings.editor.shiftAllAmount') || 'Shift All amount'}
        description={t('settings.editor.shiftAllAmountDesc') || 'Seconds applied per Shift All button press'}
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
        icon={MousePointer}
        label={t('settings.shortcuts.rangeSelectLabel') || 'Select a range'}
        description={t('settings.shortcuts.rangeSelectDesc') || 'Hold + Click to select a continuous block of lines'}
      >
        <ModifierInput
          value={settings.shortcuts?.rangeSelect?.[0] || 'Shift'}
          onChange={handleShortcutChange('rangeSelect')}
          validateModifier={(v) => v !== (settings.shortcuts?.toggleSelect?.[0] || 'Ctrl')}
        />
      </SettingRow>
      <SettingRow
        icon={MousePointerClick}
        label={t('settings.shortcuts.toggleSelectLabel') || 'Pick individual lines'}
        description={t('settings.shortcuts.toggleSelectDesc') || 'Hold + Click to add/remove single lines from the selection'}
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
