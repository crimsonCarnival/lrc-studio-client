// Shared by the standalone ThemeLangSwitcher (guests) and the in-menu picker
// in UserMenu (#14), so the theme list stays a single source of truth.
export const THEMES = [
  { id: 'dark', labelKey: 'settings.options.themes.dark', iconName: 'dark_mode' },
  { id: 'light', labelKey: 'settings.options.themes.light', iconName: 'light_mode' },
] as const;

// Languages the picker offers, shared by the header switcher and the phone drawer.
const LANG_NAMES: Record<string, Record<string, string>> = {
  en: { en: 'English', es: 'Inglés' },
  es: { en: 'Spanish', es: 'Español' },
};

export const LANGUAGES = [
  { code: 'en', short: 'EN' },
  { code: 'es', short: 'ES' },
];

export function getLangLabel(code: string, currentLang: string): string {
  const native = LANG_NAMES[code]?.[code] || code;
  const translated = LANG_NAMES[code]?.[currentLang];
  if (!translated || translated === native) return native;
  return `${native} (${translated})`;
}
