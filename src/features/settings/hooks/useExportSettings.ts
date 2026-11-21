import type { UpdateSetting, ChangeLike } from '@/features/settings/settings.types';

export function useExportSettings(updateSetting: UpdateSetting) {
  const handleLineEndingsChange = (e: ChangeLike) => updateSetting('export.lineEndings', e.target.value);

  // Copy and download both produce the file the export dialog previews, so the two formats
  // move together (as they do from the dialog and on an editor mode change).
  const handleDownloadFormatChange = (e: ChangeLike) => {
    updateSetting('export.copyFormat', e.target.value);
    updateSetting('export.downloadFormat', e.target.value);
  };

  const handleTimestampPrecisionChange = (e: ChangeLike) =>
    updateSetting('editor.timestampPrecision', e.target.value);

  const handleWordTimestampPrecisionChange = (e: ChangeLike) =>
    updateSetting('export.wordTimestampPrecision', e.target.value);

  const handleFilenamePatternChange = (e: ChangeLike) =>
    updateSetting('export.defaultFilenamePattern', e.target.value);

  return {
    handleLineEndingsChange,
    handleDownloadFormatChange,
    handleTimestampPrecisionChange,
    handleWordTimestampPrecisionChange,
    handleFilenamePatternChange,
  };
}
