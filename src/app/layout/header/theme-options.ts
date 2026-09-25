// Shared by the standalone ThemeLangSwitcher (guests) and the in-menu picker
// in UserMenu (#14), so the theme list stays a single source of truth.
export const THEMES = [
  { id: 'dark', labelKey: 'settings.options.themes.dark', iconName: 'dark_mode' },
  { id: 'light', labelKey: 'settings.options.themes.light', iconName: 'light_mode' },
] as const;
