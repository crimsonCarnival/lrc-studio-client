import { useTranslation } from 'react-i18next';
import { Section, SettingRow, Toggle, UnitInput, SettingSelect, SettingOption } from '../shared';
import { useEditorSettings } from '../../hooks/useEditorSettings';

interface EditorSettingsProps {
  settings: {
    editor?: {
      autoPauseOnMark?: boolean;
      nudge?: { default?: number; fine?: number };
      autoAdvance?: { enabled?: boolean; mode?: string; skipBlank?: boolean };
      preserveEmptyLines?: boolean;
      showShiftAll?: boolean;
      shiftAllAmount?: number;
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

const round = (v: number, decimals: number) => Number(v.toFixed(decimals));

export default function EditorSettings({ settings, updateSetting, searchTerm }: EditorSettingsProps) {
  const { t } = useTranslation();
  const {
    handleAutoPauseChange,
    handleAutoAdvanceChange,
    handleSkipBlankChange,
    handlePreserveEmptyLinesChange,
    handleShowShiftAllChange,
    handleShowLineNumbersChange,
    handleTimestampPrecisionChange,
  } = useEditorSettings(updateSetting);
  const editor = settings.editor;
  const advanceOn = editor?.autoAdvance?.enabled ?? true;
  const shiftOn = editor?.showShiftAll ?? true;

  return (
    <>
      <Section title={t('settings.editor.markSection')} searchTerm={searchTerm}>
        <SettingRow label={t('settings.playback.autoPauseOnMark')} description={t('settings.playback.autoPauseOnMarkDesc')}>
          <Toggle id="toggle-auto-pause-on-mark" label={t('settings.playback.autoPauseOnMark')} checked={editor?.autoPauseOnMark ?? false} onChange={handleAutoPauseChange} />
        </SettingRow>
        <SettingRow label={t('settings.editor.autoAdvance')} description={t('settings.editor.autoAdvanceDesc')}>
          <Toggle id="toggle-auto-advance" label={t('settings.editor.autoAdvance')} checked={advanceOn} onChange={handleAutoAdvanceChange} />
        </SettingRow>
        <SettingRow nested disabled={!advanceOn} label={t('settings.editor.autoAdvanceMode')} description={t('settings.editor.autoAdvanceModeDesc')}>
          <SettingSelect
            label={t('settings.editor.autoAdvanceMode')}
            value={editor?.autoAdvance?.mode ?? 'next'}
            onValueChange={(val) => updateSetting('editor.autoAdvance.mode', val)}
          >
            <SettingOption value="next">{t('settings.editor.advanceModeNext')}</SettingOption>
            <SettingOption value="next-unsynced">{t('settings.editor.advanceModeNextUnsynced')}</SettingOption>
          </SettingSelect>
        </SettingRow>
        <SettingRow nested disabled={!advanceOn} label={t('settings.editor.skipBlank')} description={t('settings.editor.skipBlankDesc')}>
          <Toggle id="toggle-skip-blank" label={t('settings.editor.skipBlank')} disabled={!advanceOn} checked={editor?.autoAdvance?.skipBlank ?? false} onChange={handleSkipBlankChange} />
        </SettingRow>
      </Section>

      <Section title={t('settings.editor.timingSection')} searchTerm={searchTerm}>
        <SettingRow label={t('settings.editor.nudgeStep')} description={t('settings.editor.nudgeStepDesc')}>
          <div className="flex flex-wrap items-center gap-2.5">
            <UnitInput
              label={t('settings.editor.nudgeIncrement')}
              unit="s"
              step={0.01}
              min={0.01}
              max={5}
              value={editor?.nudge?.default ?? 0.1}
              onChange={(v) => updateSetting('editor.nudge.default', Math.max(0.01, round(v, 3) || 0.1))}
            />
            <UnitInput
              label={t('settings.editor.nudgeFine')}
              unit={t('settings.editor.nudgeFineUnit')}
              className="w-32"
              step={0.001}
              min={0.001}
              max={1}
              value={editor?.nudge?.fine ?? 0.01}
              onChange={(v) => updateSetting('editor.nudge.fine', Math.max(0.001, round(v, 3) || 0.01))}
            />
          </div>
        </SettingRow>
        <SettingRow label={t('settings.editor.showShiftAll')} description={t('settings.editor.showShiftAllDesc')}>
          <Toggle id="toggle-shift-all" label={t('settings.editor.showShiftAll')} checked={shiftOn} onChange={handleShowShiftAllChange} />
        </SettingRow>
        <SettingRow nested disabled={!shiftOn} label={t('settings.editor.shiftAllAmount')} description={t('settings.editor.shiftAllAmountDesc')}>
          <UnitInput
            label={t('settings.editor.shiftAllAmount')}
            unit="s"
            disabled={!shiftOn}
            step={0.1}
            min={0.01}
            value={editor?.shiftAllAmount ?? 0.5}
            onChange={(v) => updateSetting('editor.shiftAllAmount', Math.max(0.01, round(v, 3) || 0.5))}
          />
        </SettingRow>
      </Section>

      <Section title={t('settings.editor.displaySection')} searchTerm={searchTerm}>
        <SettingRow label={t('settings.editor.showLineNumbers')} description={t('settings.editor.showLineNumbersDesc')}>
          <Toggle id="toggle-line-numbers" label={t('settings.editor.showLineNumbers')} checked={editor?.showLineNumbers ?? true} onChange={handleShowLineNumbersChange} />
        </SettingRow>
        <SettingRow label={t('settings.editor.timestampPrecision')} description={t('settings.editor.timestampPrecisionDesc')}>
          <SettingSelect
            label={t('settings.editor.timestampPrecision')}
            value={editor?.timestampPrecision ?? 'hundredths'}
            onValueChange={(val) => handleTimestampPrecisionChange({ target: { value: val } })}
          >
            <SettingOption value="hundredths">{t('settings.options.precision.hundredths')}</SettingOption>
            <SettingOption value="thousandths">{t('settings.options.precision.thousandths')}</SettingOption>
          </SettingSelect>
        </SettingRow>
        <SettingRow label={t('settings.editor.syncFlashDuration')} description={t('settings.editor.syncFlashDurationDesc')}>
          <SettingSelect
            label={t('settings.editor.syncFlashDuration')}
            value={editor?.syncFlashDuration ?? 'normal'}
            onValueChange={(val) => updateSetting('editor.syncFlashDuration', val)}
          >
            <SettingOption value="short">{t('settings.options.durations.short')}</SettingOption>
            <SettingOption value="normal">{t('settings.options.durations.normal')}</SettingOption>
            <SettingOption value="long">{t('settings.options.durations.long')}</SettingOption>
          </SettingSelect>
        </SettingRow>
        <SettingRow label={t('settings.editor.lyricsSearchSpeed')} description={t('settings.editor.lyricsSearchSpeedDesc')}>
          <SettingSelect
            label={t('settings.editor.lyricsSearchSpeed')}
            value={editor?.lyricsSearchSpeed ?? 'normal'}
            onValueChange={(val) => updateSetting('editor.lyricsSearchSpeed', val)}
          >
            <SettingOption value="fast">{t('settings.options.speeds.fast')}</SettingOption>
            <SettingOption value="normal">{t('settings.options.speeds.normal')}</SettingOption>
            <SettingOption value="slow">{t('settings.options.speeds.slow')}</SettingOption>
          </SettingSelect>
        </SettingRow>
      </Section>

      <Section title={t('settings.editor.importSection')} searchTerm={searchTerm}>
        <SettingRow label={t('settings.editor.preserveEmptyLines')} description={t('settings.editor.preserveEmptyLinesDesc')}>
          <Toggle id="toggle-preserve-empty-lines" label={t('settings.editor.preserveEmptyLines')} checked={editor?.preserveEmptyLines ?? false} onChange={handlePreserveEmptyLinesChange} />
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
            step={0.1}
            value={editor?.srt?.minSubtitleGap ?? 0}
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
