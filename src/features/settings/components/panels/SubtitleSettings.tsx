import { useTranslation } from 'react-i18next';
import { Section, SettingRow, Toggle, UnitInput, SettingSelect, SettingOption } from '../shared';
import { SUBTITLE_FORMATS, isSubtitleFormat } from '@/features/subtitles/subtitles.types';

interface SubtitleSettingsProps {
  settings: {
    editor?: { srt?: { defaultSubtitleDuration?: number; minSubtitleGap?: number; snapToNextLine?: boolean } };
    export?: { subtitleFormat?: string };
  };
  updateSetting: (path: string, value: unknown) => void;
  searchTerm?: string;
}

/** Subtitle timing (SRT mode, the subtitle studio, every subtitle export) and the file format written. */
export default function SubtitleSettings({ settings, updateSetting, searchTerm }: SubtitleSettingsProps) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;
  const editor = settings.editor;
  const format = isSubtitleFormat(settings.export?.subtitleFormat) ? settings.export.subtitleFormat : 'srt';

  return (
    <>
      <Section title={t('settings.subtitles.fileSection')} searchTerm={searchTerm}>
        <SettingRow label={t('settings.subtitles.format')} description={tk(`settings.subtitles.formatDesc.${format}`)}>
          <SettingSelect label={t('settings.subtitles.format')} value={format} onValueChange={(val) => updateSetting('export.subtitleFormat', val)}>
            {SUBTITLE_FORMATS.map((f) => (
              <SettingOption key={f} value={f}>{tk(`export.container${f[0].toUpperCase()}${f.slice(1)}`)}</SettingOption>
            ))}
          </SettingSelect>
        </SettingRow>
      </Section>

      <Section title={t('settings.editor.srtSection')} searchTerm={searchTerm}>
        <SettingRow label={t('settings.editor.srtDuration')} description={t('settings.editor.srtDurationDesc')}>
          <UnitInput
            label={t('settings.editor.srtDuration')}
            unit="s"
            min={0.5}
            max={30}
            step={0.5}
            value={editor?.srt?.defaultSubtitleDuration ?? 5}
            onChange={(v) => updateSetting('editor.srt.defaultSubtitleDuration', Math.min(30, Math.max(0.5, v || 5)))}
          />
        </SettingRow>
        <SettingRow label={t('settings.editor.srtGap')} description={t('settings.editor.srtGapDesc')}>
          <UnitInput
            label={t('settings.editor.srtGap')}
            unit="s"
            min={0}
            max={5}
            step={0.01}
            value={editor?.srt?.minSubtitleGap ?? 0.05}
            onChange={(v) => updateSetting('editor.srt.minSubtitleGap', Math.min(5, Math.max(0, v || 0)))}
          />
        </SettingRow>
        <SettingRow label={t('settings.editor.srtSnap')} description={t('settings.editor.srtSnapDesc')}>
          <Toggle id="toggle-srt-snap" label={t('settings.editor.srtSnap')} checked={editor?.srt?.snapToNextLine ?? false} onChange={(v) => updateSetting('editor.srt.snapToNextLine', v)} />
        </SettingRow>
      </Section>
    </>
  );
}
