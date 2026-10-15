import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function useThemeSync(theme?: string) {
  const { i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

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
  // When language changes, update the URL silently.
  // The URL is read from the browser, not from the router state of this render: a child's
  // <Navigate> (every legacy /profile/… or /u/… link) runs its replace before this effect does, and
  // writing back the render's older path would undo that redirect and bounce between the two.
  useEffect(() => {
    const currentHl = i18n.language?.split('-')[0];
    if (!currentHl) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('hl') === currentHl) return;
    url.searchParams.set('hl', currentHl);
    navigate(`${url.pathname}${url.search}${url.hash}`, { replace: true });
  }, [i18n.language, navigate]);

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
