type UpdateSetting = (path: string, value: unknown) => void;
type ChangeLike = { target: { value: string } };

export function useEditorSettings(updateSetting: UpdateSetting) {
  const handleAutoPauseChange = (v: boolean) => updateSetting('editor.autoPauseOnMark', v);

  const handleNudgeChange = (e: ChangeLike) =>
    updateSetting('editor.nudge.default', Math.max(0.01, parseFloat(e.target.value) || 0.1));

  const handleAutoAdvanceChange = (v: boolean) => updateSetting('editor.autoAdvance.enabled', v);

  const handleSkipBlankChange = (v: boolean) => updateSetting('editor.autoAdvance.skipBlank', v);

  const handlePreserveEmptyLinesChange = (v: boolean) => updateSetting('editor.preserveEmptyLines', v);

  const handleShowShiftAllChange = (v: boolean) => updateSetting('editor.showShiftAll', v);

  const handleShowLineNumbersChange = (v: boolean) => updateSetting('editor.showLineNumbers', v);

  const handleTimestampPrecisionChange = (e: ChangeLike) =>
    updateSetting('editor.timestampPrecision', e.target.value);

  return {
    handleAutoPauseChange,
    handleNudgeChange,
    handleAutoAdvanceChange,
    handleSkipBlankChange,
    handlePreserveEmptyLinesChange,
    handleShowShiftAllChange,
    handleShowLineNumbersChange,
    handleTimestampPrecisionChange,
  };
}
