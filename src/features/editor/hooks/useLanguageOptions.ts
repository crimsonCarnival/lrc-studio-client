import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LANG_KEYS } from '../constants/languages';
import { getMyMusicLibrary } from '../music-library.service';

interface LangOption {
  value: string;
  label: string;
}

interface MusicLibraryEntry {
  language?: string;
  [key: string]: unknown;
}

export function useLanguageOptions(): LangOption[] {
  const { i18n } = useTranslation();
  const [musicLibrary, setMusicLibrary] = useState<MusicLibraryEntry[]>([]);

  useEffect(() => {
    getMyMusicLibrary().then((lib) => setMusicLibrary(lib as MusicLibraryEntry[])).catch(console.error);
  }, []);

  return useMemo(() => {
    let displayNames: { of: (code: string) => string | undefined };
    try {
      displayNames = new Intl.DisplayNames([i18n.language || 'en'], { type: 'language' });
    } catch {
      displayNames = { of: (code: string) => code };
    }

    const baseOptions: LangOption[] = LANG_KEYS.flatMap((k: string) => {
      let label = k;
      try { label = displayNames.of(k) || k; } catch { /* ignore */ }
      // Skip entries where Intl couldn't resolve a real name (returned raw code)
      if (!label || label.toLowerCase() === k.toLowerCase()) return [];
      label = label.charAt(0).toUpperCase() + label.slice(1);
      return [{ value: label, label }];
    }).sort((a, b) => a.label.localeCompare(b.label));

    const seen = new Set(baseOptions.map(o => o.value.toLowerCase()));
    const customOptions: LangOption[] = [];
    for (const entry of musicLibrary) {
      if (!entry.language) continue;
      const key = entry.language.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      customOptions.push({ value: entry.language, label: entry.language });
    }

    return [...baseOptions, ...customOptions];
  }, [i18n.language, musicLibrary]);
}
