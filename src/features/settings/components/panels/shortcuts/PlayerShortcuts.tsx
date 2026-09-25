import { useTranslation } from 'react-i18next';
import { Section, SettingRow, ShortcutInput } from '../../shared';

interface PlayerShortcutsProps {
  settings: { shortcuts?: Record<string, string[] | undefined>; playback?: { seekTime?: number } };
  searchTerm?: string;
  handleShortcutChange: (key: string) => (value: string) => void;
  validateShortcut: (value: string, key: string) => boolean;
  conflictMap: Record<string, string>;
}

export default function PlayerShortcuts({ settings, searchTerm, handleShortcutChange, validateShortcut, conflictMap }: PlayerShortcutsProps) {
  const { t } = useTranslation();

  return (
    <Section title={t('settings.shortcuts.playerSection')} iconName="headphones" searchTerm={searchTerm}>
      <SettingRow
        iconName="play_arrow"
        label={t('settings.shortcuts.playPauseLabel')}
        description={t('settings.shortcuts.playPauseDesc')}
      >
        <ShortcutInput
          value={settings.shortcuts?.playPause?.[0] || 'Space'}
          onChange={handleShortcutChange('playPause')}
          onValidate={(v) => validateShortcut(v, 'playPause')}
          conflict={conflictMap['playPause']}
        />
      </SettingRow>
      <SettingRow
        iconName="skip_previous"
        label={t('settings.shortcuts.seekBackwardLabel')}
        description={t('settings.shortcuts.seekBackwardDesc', { val: settings.playback?.seekTime ?? 5 })}
      >
        <ShortcutInput
          value={settings.shortcuts?.seekBackward?.[0] || 'ArrowLeft'}
          onChange={handleShortcutChange('seekBackward')}
          onValidate={(v) => validateShortcut(v, 'seekBackward')}
          conflict={conflictMap['seekBackward']}
        />
      </SettingRow>
      <SettingRow
        iconName="skip_next"
        label={t('settings.shortcuts.seekForwardLabel')}
        description={t('settings.shortcuts.seekForwardDesc', { val: settings.playback?.seekTime ?? 5 })}
      >
        <ShortcutInput
          value={settings.shortcuts?.seekForward?.[0] || 'ArrowRight'}
          onChange={handleShortcutChange('seekForward')}
          onValidate={(v) => validateShortcut(v, 'seekForward')}
          conflict={conflictMap['seekForward']}
        />
      </SettingRow>
      <SettingRow
        iconName="volume_off"
        label={t('settings.shortcuts.muteLabel')}
        description={t('settings.shortcuts.muteDesc')}
      >
        <ShortcutInput
          value={settings.shortcuts?.mute?.[0] || 'm'}
          onChange={handleShortcutChange('mute')}
          onValidate={(v) => validateShortcut(v, 'mute')}
          conflict={conflictMap['mute']}
        />
      </SettingRow>
      <SettingRow
        iconName="keyboard_double_arrow_up"
        label={t('settings.shortcuts.speedUpLabel')}
        description={t('settings.shortcuts.speedUpDesc')}
      >
        <ShortcutInput
          value={settings.shortcuts?.speedUp?.[0] || '+'}
          onChange={handleShortcutChange('speedUp')}
          onValidate={(v) => validateShortcut(v, 'speedUp')}
          conflict={conflictMap['speedUp']}
        />
      </SettingRow>
      <SettingRow
        iconName="keyboard_double_arrow_down"
        label={t('settings.shortcuts.speedDownLabel')}
        description={t('settings.shortcuts.speedDownDesc')}
      >
        <ShortcutInput
          value={settings.shortcuts?.speedDown?.[0] || '-'}
          onChange={handleShortcutChange('speedDown')}
          onValidate={(v) => validateShortcut(v, 'speedDown')}
          conflict={conflictMap['speedDown']}
        />
      </SettingRow>
    </Section>
  );
}
