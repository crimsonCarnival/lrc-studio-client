import { useTranslation } from 'react-i18next';
import { Section, SettingRow, Toggle, UnitInput } from '../shared';
import { usePlaybackSettings } from '../../hooks/usePlaybackSettings';
import { DEFAULT_SETTINGS } from '../../settings-defaults';
import type { AppSettings } from '@/features/settings/settings.types';
import { Tip } from '@ui/tip';
import { cn } from '@/shared/utils/utils';
import { miniPlayerSettings, MINI_PLAYER_POSITIONS } from '@/features/player/mini-player';

// 'bottom-right' -> 'bottomRight', the key settings.options.positions uses.
const positionKey = (p: string) => p.replace(/-(?:[a-z])/, (m) => m.slice(1).toUpperCase());

const MAX_PRESETS = 6;
// Offered in this order when "Add" is pressed: the first one not already present and inside
// the allowed range. Long enough that the cap (MAX_PRESETS) is reachable on the default range.
const PRESET_CANDIDATES = [2, 0.75, 1.25, 3, 1.75, 1.5, 0.5, 2.5, 0.9, 1.1, 0.25, 4, 5];

const formatSpeed = (v: number) => `${String(v).replace('.', ',')}×`;

interface PlaybackSettingsProps {
  settings: AppSettings;
  updateSetting: (path: string, value: unknown) => void;
  searchTerm?: string;
}

export default function PlaybackSettings({ settings, updateSetting, searchTerm }: PlaybackSettingsProps) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;
  const mini = miniPlayerSettings(settings.interface);
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

  const minSpeed = settings.playback?.speedBounds?.min ?? 0.25;
  const maxSpeed = settings.playback?.speedBounds?.max ?? 3;
  const inRange = (v: number) => v >= minSpeed && v <= maxSpeed;
  const nextPreset = PRESET_CANDIDATES.find((x) => !presets.includes(x) && inRange(x));
  const addPreset = () => {
    if (nextPreset !== undefined) setPresets([...presets, nextPreset].sort((a, b) => a - b));
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
              <Tip content={inRange(v) ? undefined : t('settings.playback.presetOutOfRange')}>
                <span
                  key={v}
                  // The player drops presets outside the allowed range; show them as inactive, not gone.
                  className={`flex items-center h-[34px] pl-3 rounded-pill bg-zinc-800 text-zinc-100 font-mono text-[13px] ${inRange(v) ? '' : 'opacity-50 line-through'}`}
                >
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
              </Tip>
            ))}
            {presets.length < MAX_PRESETS && nextPreset !== undefined && (
              <button
                type="button"
                onClick={addPreset}
                className="h-[34px] px-3 rounded-pill border border-dashed border-zinc-700 text-primary text-[13px] font-semibold hover:bg-zinc-800"
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

      <Section title={t('settings.interface.miniPlayerSection')} searchTerm={searchTerm}>
        <SettingRow label={t('settings.interface.miniPlayer')} description={t('settings.interface.miniPlayerDesc')}>
          <Toggle id="toggle-mini-player" label={t('settings.interface.miniPlayer')} checked={mini.enabled} onChange={(v: boolean) => updateSetting('interface.miniPlayer', v)} />
        </SettingRow>
        <SettingRow label={t('settings.interface.miniPlayerPosition')} description={tk(`settings.options.positions.${positionKey(mini.position)}`)}>
          {/* A miniature screen: the lit corner is where the player sits. */}
          <div
            role="radiogroup"
            aria-label={t('settings.interface.miniPlayerPosition')}
            aria-disabled={!mini.enabled}
            className={cn('grid grid-cols-2 gap-1 w-[120px] h-[72px] p-1 rounded-[calc(var(--radius)*1)] border border-zinc-700 bg-zinc-950', !mini.enabled && 'opacity-50')}
          >
            {MINI_PLAYER_POSITIONS.map((p) => {
              const on = mini.position === p;
              const label = tk(`settings.options.positions.${positionKey(p)}`);
              return (
                <Tip key={p} content={label}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={label}
                    disabled={!mini.enabled}
                    onClick={() => updateSetting('interface.miniPlayerPosition', p)}
                    className={cn('flex p-1 rounded-md', p.startsWith('top') ? 'items-start' : 'items-end', p.endsWith('left') ? 'justify-start' : 'justify-end', on ? 'bg-zinc-800' : 'hover:bg-zinc-900')}
                  >
                    <span className={cn('block w-[22px] h-3 rounded-[calc(var(--radius)*0.3)]', on ? 'bg-primary' : 'bg-zinc-700')} />
                  </button>
                </Tip>
              );
            })}
          </div>
        </SettingRow>
        <SettingRow label={t('settings.interface.miniPlayerKeepPlaying')} description={t('settings.interface.miniPlayerKeepPlayingDesc')}>
          <Toggle id="toggle-mini-player-keep-playing" label={t('settings.interface.miniPlayerKeepPlaying')} checked={mini.keepPlaying} disabled={!mini.enabled} onChange={(v: boolean) => updateSetting('interface.miniPlayerKeepPlaying', v)} />
        </SettingRow>
        <SettingRow label={t('settings.interface.miniPlayerLyrics')} description={t('settings.interface.miniPlayerLyricsDesc')}>
          <Toggle id="toggle-mini-player-lyrics" label={t('settings.interface.miniPlayerLyrics')} checked={mini.lyrics} disabled={!mini.enabled} onChange={(v: boolean) => updateSetting('interface.miniPlayerLyrics', v)} />
        </SettingRow>
      </Section>
    </>
  );
}
