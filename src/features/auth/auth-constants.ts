const LANG_NAMES = {
  en: { en: 'English', es: 'Inglés' },
  es: { en: 'Spanish', es: 'Español' },
};

export const LANGUAGES = [
  { code: 'en', short: 'EN' },
  { code: 'es', short: 'ES' },
];

export function getLangLabel(code, currentLang) {
  const native = LANG_NAMES[code]?.[code] || code;
  const translated = LANG_NAMES[code]?.[currentLang];
  if (!translated || translated === native) return native;
  return `${native} (${translated})`;
}

