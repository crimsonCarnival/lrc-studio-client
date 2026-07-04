import { useTranslation } from 'react-i18next';
import { Section, SettingRow, ShortcutInput } from '../../shared';
import { Icon } from '@/shared/ui/Icon';

const HeadphonesIcon = ({ className }: { className?: string }) => <Icon name="headphones" className={className} />;
const PlayIcon = ({ className }: { className?: string }) => <Icon name="play_arrow" className={className} />;
const SkipBackIcon = ({ className }: { className?: string }) => <Icon name="skip_previous" className={className} />;
const SkipForwardIcon = ({ className }: { className?: string }) => <Icon name="skip_next" className={className} />;
const VolumeXIcon = ({ className }: { className?: string }) => <Icon name="volume_off" className={className} />;
const ChevronsUpIcon = ({ className }: { className?: string }) => <Icon name="keyboard_double_arrow_up" className={className} />;
const ChevronsDownIcon = ({ className }: { className?: string }) => <Icon name="keyboard_double_arrow_down" className={className} />;

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
    <Section title={t('settings.shortcuts.playerSection') || 'Player'} icon={HeadphonesIcon} searchTerm={searchTerm}>
      <SettingRow
        icon={PlayIcon}
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
        icon={SkipBackIcon}
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
        icon={SkipForwardIcon}
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
        icon={VolumeXIcon}
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
        icon={ChevronsUpIcon}
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
        icon={ChevronsDownIcon}
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
