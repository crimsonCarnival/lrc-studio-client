import { LANG_KEYS } from '../constants/languages';

// The language picker stores a language *name* in the UI language of whoever filled it in
// ("English", "Inglés", "Japonés"), not a code. These are the UI languages a stored name
// can come from.
const SOURCE_LOCALES = ['en', 'es'];

let byName: Map<string, string> | null = null;

/** name (lower case, in any source locale or in the language itself) -> ISO 639-1 code */
function nameIndex(): Map<string, string> {
  if (byName) return byName;
  byName = new Map();
  const namers = SOURCE_LOCALES.map((l) => new Intl.DisplayNames([l], { type: 'language' }));
  for (const code of LANG_KEYS as string[]) {
    let native: string | undefined;
    try { native = new Intl.DisplayNames([code], { type: 'language' }).of(code); } catch { /* unknown to Intl */ }
    for (const name of [...namers.map((n) => n.of(code)), native]) {
      if (name && name.toLowerCase() !== code) byName.set(name.toLowerCase(), code);
    }
  }
  return byName;
}

/**
 * A stored song language shown in the viewer's language: "Inglés" reads "English" to an
 * English viewer and "English" reads "inglés" to a Spanish one. Accepts a code ("en") too.
 * A value that is neither (a custom entry) is returned as it was typed.
 */
export function localizeSongLanguage(stored: string, locale: string): string {
  const value = stored.trim();
  if (!value) return value;
  const code = nameIndex().get(value.toLowerCase()) ?? (/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(value) ? value : null);
  if (!code) return value;
  try {
    const name = new Intl.DisplayNames([locale], { type: 'language' }).of(code);
    return name && name.toLowerCase() !== code.toLowerCase() ? name : value;
  } catch {
    return value;
  }
}
