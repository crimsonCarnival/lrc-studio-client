export function useEditorSettings(updateSetting) {
  const handleAutoPauseChange = (v) => updateSetting('editor.autoPauseOnMark', v);

  const handleNudgeChange = (e) =>
    updateSetting('editor.nudge.default', Math.max(0.01, parseFloat(e.target.value) || 0.1));

  const handleAutoAdvanceChange = (v) => updateSetting('editor.autoAdvance.enabled', v);

  const handleSkipBlankChange = (v) => updateSetting('editor.autoAdvance.skipBlank', v);

  const handlePreserveEmptyLinesChange = (v) => updateSetting('editor.preserveEmptyLines', v);

  const handleShowShiftAllChange = (v) => updateSetting('editor.showShiftAll', v);

  const handleShowLineNumbersChange = (v) => updateSetting('editor.showLineNumbers', v);

  const handleTimestampPrecisionChange = (e) =>
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
