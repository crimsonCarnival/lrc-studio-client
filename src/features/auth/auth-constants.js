export const LANG_NAMES = {
  en: { en: 'English',  es: 'Inglés',    ja: '英語'        },
  es: { en: 'Spanish',  es: 'Español',   ja: 'スペイン語'  },
  ja: { en: 'Japanese', es: 'Japonés',   ja: '日本語'      },
};

export const LANGUAGES = [
  { code: 'en', short: 'EN' },
  { code: 'es', short: 'ES' },
  { code: 'ja', short: 'JA' },
];

export function getLangLabel(code, currentLang) {
  const native = LANG_NAMES[code]?.[code] || code;
  const translated = LANG_NAMES[code]?.[currentLang];
  if (!translated || translated === native) return native;
  return `${native} (${translated})`;
}

export const REMEMBER_ME_KEY = 'lrc-studio-remember-me';
