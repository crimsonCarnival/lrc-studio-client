import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import NumberInput from "@shared/ui/NumberInput";
import { Section, SettingRow, Toggle } from '../shared';
import { usePlaybackSettings } from '../../hooks/usePlaybackSettings';
import type { AppSettings } from '@/features/settings/settings.types';
import { Icon } from '@/shared/ui/Icon';

const HeadphonesIcon = ({ className }: { className?: string }) => <Icon name="headphones" className={className} />;
const RotateCcwIcon = ({ className }: { className?: string }) => <Icon name="restart_alt" className={className} />;
const ChevronsDownIcon = ({ className }: { className?: string }) => <Icon name="keyboard_double_arrow_down" className={className} />;
const ChevronsUpIcon = ({ className }: { className?: string }) => <Icon name="keyboard_double_arrow_up" className={className} />;
const ActivitySquareIcon = ({ className }: { className?: string }) => <Icon name="monitoring" className={className} />;
const TimerIcon = ({ className }: { className?: string }) => <Icon name="timer" className={className} />;
const MagnetIcon = ({ className }: { className?: string }) => <Icon name="magnet" className={className} />;
const PlayIcon = ({ className }: { className?: string }) => <Icon name="play_arrow" className={className} />;
const ForwardIcon = ({ className }: { className?: string }) => <Icon name="forward" className={className} />;
const ListIcon = ({ className }: { className?: string }) => <Icon name="list" className={className} />;
import { Input } from '@ui/input';

function SpeedPresetsInput({ value, onChange }: { value?: number[]; onChange: (presets: number[]) => void }) {
  const [localVal, setLocalVal] = useState<string | null>(null);

  const displayVal = localVal !== null ? localVal : (value || [0.25, 0.5, 0.75, 1, 1.25, 1.5]).join(', ');

  const handleBlur = () => {
    if (localVal === null) return;
    const parsed = localVal
      .split(',')
      .map(s => parseFloat(s.trim()))
      .filter(n => !isNaN(n) && n > 0)
      .slice(0, 6);

    if (parsed.length > 0) {
      onChange(parsed);
    }
    setLocalVal(null);
  };

  return (
    <Input
      value={displayVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      placeholder="0.25, 0.5, 1, 1.5..."
      className="w-40 bg-zinc-800/60 border-zinc-700/50 h-8 text-xs"
    />
  );
}

interface PlaybackSettingsProps {
  settings: AppSettings;
  updateSetting: (path: string, value: unknown) => void;
  searchTerm?: string;
}

export default function PlaybackSettings({ settings, updateSetting, searchTerm }: PlaybackSettingsProps) {
  const { t } = useTranslation();
  const {
    handleAutoRewindChange,
    handleMinSpeedChange,
    handleMaxSpeedChange,
    handleShowWaveformChange,
    handleWaveformSnapChange,
  } = usePlaybackSettings(settings, updateSetting);

  return (
    <>
      <Section title={t('settings.playback.speedSection') || 'Playback Speed'} icon={HeadphonesIcon} searchTerm={searchTerm}>
        <SettingRow icon={ChevronsDownIcon} label={t('settings.playback.minSpeed')} description={t('settings.playback.minSpeedDesc')}>
          <NumberInput
            min={0.05}
            max={(settings.playback?.speedBounds?.max || 3) - 0.05}
            step={0.05}
            value={settings.playback?.speedBounds?.min ?? 0.25}
            onChange={handleMinSpeedChange}
            className="w-20"
          />
        </SettingRow>
        <SettingRow icon={ChevronsUpIcon} label={t('settings.playback.maxSpeed')} description={t('settings.playback.maxSpeedDesc')}>
          <NumberInput
            min={(settings.playback?.speedBounds?.min || 0.25) + 0.05}
            max={10}
            step={0.05}
            value={settings.playback?.speedBounds?.max ?? 3}
            onChange={handleMaxSpeedChange}
            className="w-20"
          />
        </SettingRow>
        <SettingRow icon={ListIcon} label={t('settings.playback.speedPresets')} description={t('settings.playback.speedPresetsDesc')}>
          <SpeedPresetsInput
            value={settings.playback?.speedPresets}
            onChange={(val) => updateSetting('playback.speedPresets', val)}
          />
        </SettingRow>
      </Section>

      <Section title={t('settings.playback.seekSection') || 'Seeking & Navigation'} icon={ForwardIcon} searchTerm={searchTerm}>
        <SettingRow icon={RotateCcwIcon} label={t('settings.playback.autoRewind')} description={t('settings.playback.autoRewindDesc')}>
          <NumberInput
            min={0}
            max={10}
            step={1}
            value={settings.playback?.autoRewindOnPause?.seconds ?? 0}
            onChange={handleAutoRewindChange}
            className="w-20"
          />
        </SettingRow>
        <SettingRow icon={TimerIcon} label={t('settings.playback.seekTime')} description={t('settings.playback.seekTimeDesc')}>
          <NumberInput
            min={1}
            max={60}
            step={1}
            value={settings.playback?.seekTime ?? 5}
            onChange={(e) => updateSetting('playback.seekTime', Math.max(1, parseInt(e.target.value, 10) || 5))}
            className="w-20"
          />
        </SettingRow>
        <SettingRow icon={PlayIcon} label={t('settings.playback.seekPlays')} description={t('settings.playback.seekPlaysDesc')}>
          <Toggle
            id="toggle-seek-plays"
            checked={settings.playback?.seekPlays ?? false}
            onChange={(v) => updateSetting('playback.seekPlays', v)}
          />
        </SettingRow>
      </Section>

      <Section title={t('settings.playback.waveformSection') || 'Waveform'} icon={ActivitySquareIcon} searchTerm={searchTerm}>
        <SettingRow icon={ActivitySquareIcon} label={t('settings.playback.showWaveform')} description={t('settings.playback.showWaveformDesc')}>
          <Toggle
            id="toggle-waveform"
            checked={settings.playback?.showWaveform ?? true}
            onChange={handleShowWaveformChange}
          />
        </SettingRow>
        <SettingRow icon={MagnetIcon} label={t('settings.playback.waveformSnap')} description={t('settings.playback.waveformSnapDesc')}>
          <Toggle
            id="toggle-waveform-snap"
            checked={settings.playback?.waveformSnap ?? false}
            onChange={handleWaveformSnapChange}
          />
        </SettingRow>
      </Section>
    </>
  );
}
