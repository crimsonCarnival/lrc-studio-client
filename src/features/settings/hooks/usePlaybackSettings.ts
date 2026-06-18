import type { AppSettings } from '@/features/settings/settings.types';

type UpdateSetting = (path: string, value: unknown) => void;
type ChangeLike = { target: { value: string } };

export function usePlaybackSettings(settings: AppSettings, updateSetting: UpdateSetting) {
  const handleAutoRewindChange = (e: ChangeLike) => {
    const val = Math.max(0, parseFloat(e.target.value) || 0);
    updateSetting('playback.autoRewindOnPause', { enabled: val > 0, seconds: val });
  };

  const handleMinSpeedChange = (e: ChangeLike) => {
    updateSetting(
      'playback.speedBounds.min',
      Math.max(0.05, parseFloat(e.target.value) || 0.05),
    );
  };

  const handleMaxSpeedChange = (e: ChangeLike) => {
    updateSetting(
      'playback.speedBounds.max',
      Math.max(
        (settings.playback?.speedBounds?.min || 0.25) + 0.05,
        parseFloat(e.target.value) || 1,
      ),
    );
  };

  const handleShowWaveformChange = (v: boolean) => updateSetting('playback.showWaveform', v);
  const handleWaveformSnapChange = (v: boolean) => updateSetting('playback.waveformSnap', v);

  return {
    handleAutoRewindChange,
    handleMinSpeedChange,
    handleMaxSpeedChange,
    handleShowWaveformChange,
    handleWaveformSnapChange,
  };
}
