import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Section, SettingRow, ShortcutInput, ModifierInput } from '../shared';
import { useShortcutsSettings } from '../hooks/useShortcutsSettings';
import NumberInput from '@shared/NumberInput';
import { Button } from '@ui/button';
import {
  MapPin, ChevronLeft, ChevronRight, Plus, Trash2, X, RefreshCw, LogOut, HelpCircle,
  MousePointer, MousePointerClick, Keyboard,
  Headphones, Play, SkipBack, SkipForward, VolumeX, ChevronsUp, ChevronsDown,
  Eye, Music2, Languages, MoveHorizontal,
} from 'lucide-react';

const SHORTCUT_KEYS = [
  'mark', 'nudgeLeft', 'nudgeRight', 'addLine', 'deleteLine',
  'clearTimestamp', 'switchMode', 'deselect', 'showHelp',
  'playPause', 'seekBackward', 'seekForward', 'mute', 'speedUp', 'speedDown',
  'toggleTranslation', 'addSecondary', 'addTranslation',
];

const SHORTCUT_LABELS = {
  mark: 'Mark', nudgeLeft: 'Nudge ←', nudgeRight: 'Nudge →',
  addLine: 'Add Line', deleteLine: 'Delete', clearTimestamp: 'Clear TS',
  switchMode: 'Switch Mode', deselect: 'Deselect', showHelp: 'Help',
  playPause: 'Play/Pause', seekBackward: 'Seek ←', seekForward: 'Seek →',
  mute: 'Mute', speedUp: 'Speed+', speedDown: 'Speed−',
  toggleTranslation: 'Toggle Trans.', addSecondary: 'Secondary', addTranslation: 'Translation',
};

export default function ShortcutsSettings({ settings, updateSetting, searchTerm, validateShortcut }) {
  const { t } = useTranslation();
  const { handleShortcutChange } = useShortcutsSettings(updateSetting);
  const [subTab, setSubTab] = useState('editor');

  const conflictMap = useMemo(() => {
    const byValue = {};
    SHORTCUT_KEYS.forEach((k) => {
      const v = settings.shortcuts?.[k]?.[0];
      if (!v) return;
      if (!byValue[v]) byValue[v] = [];
      byValue[v].push(k);
    });
    const result = {};
    Object.values(byValue).forEach((keys) => {
      if (keys.length > 1) {
        keys.forEach((k) => {
          result[k] = keys.filter((other) => other !== k).map((n) => SHORTCUT_LABELS[n] ?? n).join(', ');
        });
      }
    });
    return result;
  }, [settings.shortcuts]);

  const SUB_TABS = [
    { id: 'editor',    icon: Keyboard,          label: t('settings.editor.label') || 'Editor' },
    { id: 'player',    icon: Headphones,         label: t('settings.shortcuts.playerSection') || 'Player' },
    { id: 'preview',   icon: Eye,               label: t('settings.shortcuts.previewSection') || 'Preview' },
  ];

  // When searching, show all; otherwise show only the active sub-tab
  const show = (id) => !!searchTerm || subTab === id;

  return (
    <>
      {/* Sub-tab bar — hidden during search */}
      {!searchTerm && (
        <div className="flex gap-0.5 mb-4 bg-zinc-800/40 rounded-xl p-1">
          {SUB_TABS.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              onClick={() => setSubTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-2 h-auto text-[10px] font-medium rounded-lg transition-colors ${
                subTab === tab.id
                  ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </Button>
          ))}
        </div>
      )}

      {show('editor') && (
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
            icon={X}
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
      )}

      {show('player') && (
        <Section title={t('settings.shortcuts.playerSection') || 'Player'} icon={Headphones} searchTerm={searchTerm}>
          <SettingRow
            icon={Play}
            label={t('settings.shortcuts.playPauseLabel') || 'Play / Pause'}
            description={t('settings.shortcuts.playPauseDesc') || 'Toggle playback'}
          >
            <ShortcutInput
              value={settings.shortcuts?.playPause?.[0] || 'Enter'}
              onChange={handleShortcutChange('playPause')}
              onValidate={(v) => validateShortcut(v, 'playPause')}
              conflict={conflictMap['playPause']}
            />
          </SettingRow>
          <SettingRow
            icon={SkipBack}
            label={t('settings.shortcuts.seekBackwardLabel') || 'Seek Backward'}
            description={t('settings.shortcuts.seekBackwardDesc', { val: settings.playback?.seekTime ?? 5 }) || `Seek back ${settings.playback?.seekTime ?? 5}s`}
          >
            <ShortcutInput
              value={settings.shortcuts?.seekBackward?.[0] || 'ArrowLeft'}
              onChange={handleShortcutChange('seekBackward')}
              onValidate={(v) => validateShortcut(v, 'seekBackward')}
              conflict={conflictMap['seekBackward']}
            />
          </SettingRow>
          <SettingRow
            icon={SkipForward}
            label={t('settings.shortcuts.seekForwardLabel') || 'Seek Forward'}
            description={t('settings.shortcuts.seekForwardDesc', { val: settings.playback?.seekTime ?? 5 }) || `Seek forward ${settings.playback?.seekTime ?? 5}s`}
          >
            <ShortcutInput
              value={settings.shortcuts?.seekForward?.[0] || 'ArrowRight'}
              onChange={handleShortcutChange('seekForward')}
              onValidate={(v) => validateShortcut(v, 'seekForward')}
              conflict={conflictMap['seekForward']}
            />
          </SettingRow>
          <SettingRow
            icon={VolumeX}
            label={t('settings.shortcuts.muteLabel') || 'Mute / Unmute'}
            description={t('settings.shortcuts.muteDesc') || 'Toggle audio mute'}
          >
            <ShortcutInput
              value={settings.shortcuts?.mute?.[0] || 'm'}
              onChange={handleShortcutChange('mute')}
              onValidate={(v) => validateShortcut(v, 'mute')}
              conflict={conflictMap['mute']}
            />
          </SettingRow>
          <SettingRow
            icon={ChevronsUp}
            label={t('settings.shortcuts.speedUpLabel') || 'Speed Up'}
            description={t('settings.shortcuts.speedUpDesc') || 'Increase playback speed by nudge amount'}
          >
            <ShortcutInput
              value={settings.shortcuts?.speedUp?.[0] || '+'}
              onChange={handleShortcutChange('speedUp')}
              onValidate={(v) => validateShortcut(v, 'speedUp')}
              conflict={conflictMap['speedUp']}
            />
          </SettingRow>
          <SettingRow
            icon={ChevronsDown}
            label={t('settings.shortcuts.speedDownLabel') || 'Speed Down'}
            description={t('settings.shortcuts.speedDownDesc') || 'Decrease playback speed by nudge amount'}
          >
            <ShortcutInput
              value={settings.shortcuts?.speedDown?.[0] || '-'}
              onChange={handleShortcutChange('speedDown')}
              onValidate={(v) => validateShortcut(v, 'speedDown')}
              conflict={conflictMap['speedDown']}
            />
          </SettingRow>
        </Section>
      )}

      {show('preview') && (
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
      )}
    </>
  );
}
