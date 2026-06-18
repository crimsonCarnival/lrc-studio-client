type UpdateSetting = (path: string, value: unknown) => void;
type ChangeLike = { target: { value: string } };

export function useExportSettings(updateSetting: UpdateSetting) {
  const handleLineEndingsChange = (e: ChangeLike) => updateSetting('export.lineEndings', e.target.value);

  const handleCopyFormatChange = (e: ChangeLike) => updateSetting('export.copyFormat', e.target.value);

  const handleDownloadFormatChange = (e: ChangeLike) =>
    updateSetting('export.downloadFormat', e.target.value);

  const handleTimestampPrecisionChange = (e: ChangeLike) =>
    updateSetting('editor.timestampPrecision', e.target.value);

  const handleWordTimestampPrecisionChange = (e: ChangeLike) =>
    updateSetting('export.wordTimestampPrecision', e.target.value);

  const handleFilenamePatternChange = (e: ChangeLike) =>
    updateSetting('export.defaultFilenamePattern', e.target.value);

  return {
    handleLineEndingsChange,
    handleCopyFormatChange,
    handleDownloadFormatChange,
    handleTimestampPrecisionChange,
    handleWordTimestampPrecisionChange,
    handleFilenamePatternChange,
  };
}
