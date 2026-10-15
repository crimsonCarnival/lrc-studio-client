import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useReplaceSearch } from './useReplaceSearch';

export function useThemeSync(theme?: string) {
  const { i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const replaceSearch = useReplaceSearch();

  // 1. Apply theme — dark (default) or light
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, [theme]);

  // 2. Sync Language -> URL
  // When language changes, update the URL silently
  useEffect(() => {
    // Read the live URL, not the render-time params: a redirect issued in this same
    // commit has already moved it (see useReplaceSearch).
    const currentHl = i18n.language?.split('-')[0];
    const params = new URLSearchParams(window.location.search);
    if (currentHl && params.get('hl') !== currentHl) {
      params.set('hl', currentHl);
      replaceSearch(params);
    }
  }, [i18n.language, replaceSearch]);

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
