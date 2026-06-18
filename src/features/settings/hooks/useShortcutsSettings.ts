type UpdateSetting = (path: string, value: unknown) => void;

export function useShortcutsSettings(updateSetting: UpdateSetting) {
  const handleShortcutChange = (key: string) => (v: string) => updateSetting(`shortcuts.${key}`, [v]);

  return { handleShortcutChange };
}
