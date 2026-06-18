type UpdateSetting = (path: string, value: unknown) => void;
type ChangeLike = { target: { value: string } };

export function useAdvancedSettings(updateSetting: UpdateSetting) {
  const handleAutoSaveToggle = (v: boolean) => updateSetting('advanced.autoSave.enabled', v);

  const handleAutoSaveTimeIntervalChange = (e: ChangeLike) =>
    updateSetting('advanced.autoSave.timeInterval', parseInt(e.target.value, 10));

  const handleConfirmDestructiveChange = (v: boolean) =>
    updateSetting('advanced.confirmDestructive', v);

  const handleTimezoneChange = (e: ChangeLike) =>
    updateSetting('advanced.timezone', e.target.value);

  return {
    handleAutoSaveToggle,
    handleAutoSaveTimeIntervalChange,
    handleConfirmDestructiveChange,
    handleTimezoneChange,
  };
}
