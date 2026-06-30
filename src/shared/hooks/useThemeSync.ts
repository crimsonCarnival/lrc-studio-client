import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
export function useThemeSync() {
  const { i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Enforce Dark Theme
  // The app is now strictly dark-themed. We just ensure the dark class is present.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-cobalt', 'theme-velvet', 'theme-sage');
    root.classList.add('dark');
  }, []);

  // 2. Sync Language -> URL
  // When language changes, update the URL silently
  useEffect(() => {
    setSearchParams(prev => {
      const currentHl = i18n.language?.split('-')[0];
      const newParams = new URLSearchParams(prev);
      let changed = false;

      if (currentHl && newParams.get('hl') !== currentHl) {
        newParams.set('hl', currentHl);
        changed = true;
      }

      return changed ? newParams : prev;
    }, { replace: true });
  }, [i18n.language, setSearchParams]);

  // 3. Sync URL -> App State (Mount Only)
  // Support deep-linking by checking the URL only once when the app loads
  useEffect(() => {
    // Theme url param is ignored because it's always dark

    // Language
    const hlParam = searchParams.get('hl');
    if (hlParam && i18n.language !== hlParam) {
      i18n.changeLanguage(hlParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
