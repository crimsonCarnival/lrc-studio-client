import { useTranslation } from 'react-i18next';
import NumberInput from "@shared/ui/NumberInput";
import { Section, SettingRow, Toggle } from '../shared';
import { useEditorSettings } from '../../hooks/useEditorSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
interface EditorSettingsProps {
  settings: {
    editor?: {
      autoPauseOnMark?: boolean;
      nudge?: { default?: number; fine?: number };
      autoAdvance?: { enabled?: boolean; mode?: string; skipBlank?: boolean };
      preserveEmptyLines?: boolean;
      showShiftAll?: boolean;
      showLineNumbers?: boolean;
      timestampPrecision?: string;
      syncFlashDuration?: string;
      lyricsSearchSpeed?: string;
      srt?: { defaultSubtitleDuration?: number; minSubtitleGap?: number; snapToNextLine?: boolean };
    };
  };
  updateSetting: (path: string, value: unknown) => void;
  searchTerm?: string;
}

export default function EditorSettings({ settings, updateSetting, searchTerm }: EditorSettingsProps) {
  const { t } = useTranslation();
  const {
    handleAutoPauseChange,
    handleNudgeChange,
    handleAutoAdvanceChange,
    handleSkipBlankChange,
    handlePreserveEmptyLinesChange,
    handleShowShiftAllChange,
    handleShowLineNumbersChange,
    handleTimestampPrecisionChange,
  } = useEditorSettings(updateSetting);

  return (
    <>
    <Section title={t('settings.editor.label')} iconName="description" searchTerm={searchTerm}>
      <SettingRow
        iconName="pause_circle"
        label={t('settings.playback.autoPauseOnMark')}
        description={t('settings.playback.autoPauseOnMarkDesc')}
      >
        <Toggle
          id="toggle-auto-pause-on-mark"
          checked={settings.editor?.autoPauseOnMark ?? false}
          onChange={handleAutoPauseChange}
        />
      </SettingRow>
      <SettingRow
        iconName="tune"
        label={t('settings.editor.nudgeIncrement')}
        description={t('settings.editor.nudgeIncrementDesc')}
      >
        <NumberInput
          min={0.01}
          max={5}
          step={0.01}
          value={settings.editor?.nudge?.default ?? 0.1}
          onChange={handleNudgeChange}
          className="w-20"
        />
      </SettingRow>
      <SettingRow
        iconName="tune"
        label={t('settings.editor.nudgeFine')}
        description={t('settings.editor.nudgeFineDesc')}
      >
        <NumberInput
          min={0.001}
          max={1}
          step={0.001}
          value={settings.editor?.nudge?.fine ?? 0.01}
          onChange={(e) => updateSetting('editor.nudge.fine', Math.max(0.001, parseFloat(e.target.value) || 0.01))}
          className="w-20"
        />
      </SettingRow>
      <SettingRow iconName="expand_more" label={t('settings.editor.autoAdvance')} description={t('settings.editor.autoAdvanceDesc')}>
        <Toggle
          id="toggle-auto-advance"
          checked={settings.editor?.autoAdvance?.enabled ?? true}
          onChange={handleAutoAdvanceChange}
        />
      </SettingRow>
      <SettingRow iconName="skip_next" label={t('settings.editor.autoAdvanceMode')} description={t('settings.editor.autoAdvanceModeDesc')}>
        <Select
          value={settings.editor?.autoAdvance?.mode ?? 'next'}
          onValueChange={(val) => updateSetting('editor.autoAdvance.mode', val)}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="next">{t('settings.editor.advanceModeNext')}</SelectItem>
            <SelectItem value="next-unsynced">{t('settings.editor.advanceModeNextUnsynced')}</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow iconName="skip_next" label={t('settings.editor.skipBlank')} description={t('settings.editor.skipBlankDesc')}>
        <Toggle
          id="toggle-skip-blank"
          checked={settings.editor?.autoAdvance?.skipBlank ?? false}
          onChange={handleSkipBlankChange}
        />
      </SettingRow>
      <SettingRow iconName="format_align_justify" label={t('settings.editor.preserveEmptyLines')} description={t('settings.editor.preserveEmptyLinesDesc')}>
        <Toggle
          id="toggle-preserve-empty-lines"
          checked={settings.editor?.preserveEmptyLines ?? false}
          onChange={handlePreserveEmptyLinesChange}
        />
      </SettingRow>
      <SettingRow iconName="swap_horiz" label={t('settings.editor.showShiftAll')} description={t('settings.editor.showShiftAllDesc')}>
        <Toggle
          id="toggle-shift-all"
          checked={settings.editor?.showShiftAll ?? true}
          onChange={handleShowShiftAllChange}
        />
      </SettingRow>
      <SettingRow iconName="tag" label={t('settings.editor.showLineNumbers') || 'Line numbers'} description={t('settings.editor.showLineNumbersDesc') || 'Show line numbers in the editor'}>
        <Toggle
          id="toggle-line-numbers"
          checked={settings.editor?.showLineNumbers ?? true}
          onChange={handleShowLineNumbersChange}
        />
      </SettingRow>
      <SettingRow
        iconName="schedule"
        label={t('settings.editor.timestampPrecision')}
        description={t('settings.editor.timestampPrecisionDesc')}
      >
        <Select
          value={settings.editor?.timestampPrecision ?? 'hundredths'}
          onValueChange={(val) => handleTimestampPrecisionChange({ target: { value: val } })}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="hundredths">{t('settings.options.precision.hundredths')}</SelectItem>
            <SelectItem value="thousandths">{t('settings.options.precision.thousandths')}</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow
        iconName="bolt"
        label={t('settings.editor.syncFlashDuration')}
        description={t('settings.editor.syncFlashDurationDesc')}
      >
        <Select
          value={settings.editor?.syncFlashDuration ?? 'normal'}
          onValueChange={(val) => updateSetting('editor.syncFlashDuration', val)}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="short">{t('settings.options.durations.short')}</SelectItem>
            <SelectItem value="normal">{t('settings.options.durations.normal')}</SelectItem>
            <SelectItem value="long">{t('settings.options.durations.long')}</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow
        iconName="search"
        label={t('settings.editor.lyricsSearchSpeed')}
        description={t('settings.editor.lyricsSearchSpeedDesc')}
      >
        <Select
          value={settings.editor?.lyricsSearchSpeed ?? 'normal'}
          onValueChange={(val) => updateSetting('editor.lyricsSearchSpeed', val)}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="fast">{t('settings.options.speeds.fast')}</SelectItem>
            <SelectItem value="normal">{t('settings.options.speeds.normal')}</SelectItem>
            <SelectItem value="slow">{t('settings.options.speeds.slow')}</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </Section>
    <Section title={t('settings.editor.srtSection')} iconName="movie" searchTerm={searchTerm}>
      <SettingRow iconName="schedule" label={t('settings.editor.srtDuration')} description={t('settings.editor.srtDurationDesc')}>
        <NumberInput
          min={0.5}
          max={30}
          step={0.5}
          value={settings.editor?.srt?.defaultSubtitleDuration ?? 5}
          onChange={(e) => updateSetting('editor.srt.defaultSubtitleDuration', Math.max(0.5, parseFloat(e.target.value) || 5))}
          className="w-20"
        />
      </SettingRow>
      <SettingRow iconName="swap_horiz" label={t('settings.editor.srtGap')} description={t('settings.editor.srtGapDesc')}>
        <NumberInput
          min={0}
          max={5}
          step={0.1}
          value={settings.editor?.srt?.minSubtitleGap ?? 0}
          onChange={(e) => updateSetting('editor.srt.minSubtitleGap', Math.max(0, parseFloat(e.target.value) || 0))}
          className="w-20"
        />
      </SettingRow>
      <SettingRow iconName="snap_to_grid" label={t('settings.editor.srtSnap')} description={t('settings.editor.srtSnapDesc')}>
        <Toggle
          id="toggle-srt-snap"
          checked={settings.editor?.srt?.snapToNextLine ?? false}
          onChange={(v) => updateSetting('editor.srt.snapToNextLine', v)}
        />
      </SettingRow>
    </Section>
    </>
  );
}
