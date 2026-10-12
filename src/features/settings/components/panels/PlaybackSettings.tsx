import { useTranslation } from 'react-i18next';
import { Section, SettingRow, Toggle, UnitInput } from '../shared';
import { usePlaybackSettings } from '../../hooks/usePlaybackSettings';
import { DEFAULT_SETTINGS } from '../../settings-defaults';
import type { AppSettings } from '@/features/settings/settings.types';

const MAX_PRESETS = 6;
// Offered in this order when "Add" is pressed and not already present.
const PRESET_CANDIDATES = [2, 0.75, 1.25, 3, 1.75];

const formatSpeed = (v: number) => `${String(v).replace('.', ',')}×`;

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

  const presets = settings.playback?.speedPresets ?? DEFAULT_SETTINGS.playback.speedPresets;
  const showWaveform = settings.playback?.showWaveform ?? true;
  const setPresets = (next: number[]) => updateSetting('playback.speedPresets', next);
  const asEvent = (v: number) => ({ target: { value: String(v) } });

  const addPreset = () => {
    const next = PRESET_CANDIDATES.find((x) => !presets.includes(x));
    if (next !== undefined) setPresets([...presets, next].sort((a, b) => a - b));
  };

  return (
    <>
      <Section title={t('settings.playback.speedSection')} searchTerm={searchTerm}>
        <SettingRow label={t('settings.playback.speedRange')} description={t('settings.playback.speedRangeDesc')}>
          <div className="flex items-center gap-2.5">
            <UnitInput
              label={t('settings.playback.minSpeed')}
              unit="×"
              step={0.05}
              min={0.05}
              value={settings.playback?.speedBounds?.min ?? 0.25}
              onChange={(v) => handleMinSpeedChange(asEvent(v))}
            />
            <span className="text-zinc-500">{t('settings.playback.speedRangeTo')}</span>
            <UnitInput
              label={t('settings.playback.maxSpeed')}
              unit="×"
              step={0.05}
              max={10}
              value={settings.playback?.speedBounds?.max ?? 3}
              onChange={(v) => handleMaxSpeedChange(asEvent(v))}
            />
          </div>
        </SettingRow>
        <SettingRow
          label={t('settings.playback.speedPresets')}
          description={t('settings.playback.speedPresetsDesc', { count: presets.length, max: MAX_PRESETS })}
        >
          <div className="flex flex-wrap justify-end gap-1.5">
            {presets.map((v) => (
              <span key={v} className="flex items-center h-[34px] pl-3 rounded-full bg-zinc-800 text-zinc-100 font-mono text-[13px]">
                {formatSpeed(v)}
                <button
                  type="button"
                  aria-label={t('settings.playback.removePreset', { value: formatSpeed(v) })}
                  onClick={() => setPresets(presets.filter((x) => x !== v))}
                  className="w-[30px] h-[34px] text-zinc-400 hover:text-zinc-100 text-[15px]"
                >
                  ×
                </button>
              </span>
            ))}
            {presets.length < MAX_PRESETS && (
              <button
                type="button"
                onClick={addPreset}
                className="h-[34px] px-3 rounded-full border border-dashed border-zinc-700 text-primary text-[13px] font-semibold hover:bg-zinc-800"
              >
                + {t('settings.playback.addPreset')}
              </button>
            )}
          </div>
        </SettingRow>
      </Section>

      <Section title={t('settings.playback.seekSection')} searchTerm={searchTerm}>
        <SettingRow label={t('settings.playback.autoRewind')} description={t('settings.playback.autoRewindDesc')}>
          <UnitInput
            label={t('settings.playback.autoRewind')}
            unit="s"
            min={0}
            max={10}
            value={settings.playback?.autoRewindOnPause?.seconds ?? 0}
            onChange={(v) => handleAutoRewindChange(asEvent(v))}
          />
        </SettingRow>
        <SettingRow label={t('settings.playback.seekTime')} description={t('settings.playback.seekTimeDesc')}>
          <UnitInput
            label={t('settings.playback.seekTime')}
            unit="s"
            min={1}
            max={60}
            value={settings.playback?.seekTime ?? 5}
            onChange={(v) => updateSetting('playback.seekTime', Math.min(60, Math.max(1, Math.round(v) || 5)))}
          />
        </SettingRow>
        <SettingRow label={t('settings.playback.seekPlays')} description={t('settings.playback.seekPlaysDesc')}>
          <Toggle
            id="toggle-seek-plays"
            label={t('settings.playback.seekPlays')}
            checked={settings.playback?.seekPlays ?? false}
            onChange={(v) => updateSetting('playback.seekPlays', v)}
          />
        </SettingRow>
      </Section>

      <Section title={t('settings.playback.waveformSection')} searchTerm={searchTerm}>
        <SettingRow label={t('settings.playback.showWaveform')} description={t('settings.playback.showWaveformDesc')}>
          <Toggle
            id="toggle-waveform"
            label={t('settings.playback.showWaveform')}
            checked={showWaveform}
            onChange={handleShowWaveformChange}
          />
        </SettingRow>
        <SettingRow
          nested
          disabled={!showWaveform}
          label={t('settings.playback.waveformSnap')}
          description={<>{t('settings.playback.waveformSnapDesc')}{!showWaveform && ` · ${t('settings.playback.waveformSnapNeedsWaveform')}`}</>}
        >
          <Toggle
            id="toggle-waveform-snap"
            label={t('settings.playback.waveformSnap')}
            disabled={!showWaveform}
            checked={settings.playback?.waveformSnap ?? false}
            onChange={handleWaveformSnapChange}
          />
        </SettingRow>
      </Section>
    </>
  );
}
