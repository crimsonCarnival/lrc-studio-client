import type { UpdateSetting } from '@/features/settings/settings.types';

export function useShortcutsSettings(updateSetting: UpdateSetting) {
  const handleShortcutChange = (key: string) => (v: string) => updateSetting(`shortcuts.${key}`, [v]);

  return { handleShortcutChange };
}
