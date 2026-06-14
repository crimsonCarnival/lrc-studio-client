import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LANG_KEYS } from '../constants/languages';
import { getMyMusicLibrary } from '../music-library.service';

export function useLanguageOptions() {
  const { i18n } = useTranslation();
  const [musicLibrary, setMusicLibrary] = useState(/** @type {any[]} */([]));

  useEffect(() => {
    getMyMusicLibrary().then(setMusicLibrary).catch(console.error);
  }, []);

  return useMemo(() => {
    let displayNames;
    try {
      displayNames = new Intl.DisplayNames([i18n.language || 'en'], { type: 'language' });
    } catch {
      displayNames = { of: (code) => code };
    }

    const baseOptions = LANG_KEYS.flatMap((k) => {
      let label = k;
      try { label = displayNames.of(k) || k; } catch { /* ignore */ }
      // Skip entries where Intl couldn't resolve a real name (returned raw code)
      if (!label || label.toLowerCase() === k.toLowerCase()) return [];
      label = label.charAt(0).toUpperCase() + label.slice(1);
      return [{ value: label, label }];
    }).sort((a, b) => a.label.localeCompare(b.label));

    const seen = new Set(baseOptions.map(o => o.value.toLowerCase()));
    const customOptions = [];
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
