import { useTranslation } from 'react-i18next';
import { Section, SettingRow, ShortcutInput } from '../../shared';
import {
  Headphones, Play, SkipBack, SkipForward, VolumeX, ChevronsUp, ChevronsDown
} from 'lucide-react';

export default function PlayerShortcuts({ settings, searchTerm, handleShortcutChange, validateShortcut, conflictMap }) {
  const { t } = useTranslation();

  return (
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
  );
}
