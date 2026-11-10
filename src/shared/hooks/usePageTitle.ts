import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { matchPath, useLocation, useParams } from 'react-router-dom';
import { isAdminPathname } from '@/features/admin/admin-nav';

/**
 * Custom hook to dynamically update the document title based on the current route.
 * It uses translations and syncs with the app name.
 */
export function usePageTitle(projectName: string | null = null) {
  const { t } = useTranslation();
  const location = useLocation();
  const { id, accountName, publicId } = useParams();

  useEffect(() => {
    const appName = t('app.name');
    let pageTitle: string;

    const path = location.pathname;

    // Remove leading/trailing slashes for easier matching
    const cleanPath = path.replace(/^\/|\/$/g, '');
    const rootAccount = (matchPath('/:accountName', path) ?? matchPath('/:accountName/lists/:listId', path))?.params.accountName;

    // The admin host serves its dashboard at "/" and "/home", so it has to be told apart first.
    if ((cleanPath === 'home' || cleanPath === '') && !isAdminPathname(path)) {
      pageTitle = t('app.titles.home');
    } else if (cleanPath === 'library' || cleanPath === 'projects') {
      pageTitle = t('app.titles.library');
    } else if (cleanPath.startsWith('uploads')) {
      pageTitle = projectName || t('app.titles.uploads');
    } else if (cleanPath.startsWith('profile/') || cleanPath.startsWith('u/')) {
      pageTitle = accountName || t('app.titles.profile');
    } else if (cleanPath === 'profile') {
      pageTitle = t('app.titles.profile');
    } else if (cleanPath.startsWith('auth')) {
      pageTitle = t('app.titles.auth');
    } else if (isAdminPathname(path)) {
      // Covers every tab and sub-view, on /admin/* and on the admin host's bare paths.
      pageTitle = t('app.titles.admin');
    } else if (cleanPath.startsWith('share/')) {
      pageTitle = projectName || t('app.titles.shared');
    } else if (cleanPath === 'project/new') {
      pageTitle = t('app.titles.newProject');
    } else if (cleanPath.startsWith('session/')) {
      // Just the song while it loads: the tab reads "LRC Studio", never "Live session".
      pageTitle = projectName || '';
    } else if (cleanPath === 'sessions') {
      pageTitle = t('app.titles.sessions');
    } else if (cleanPath.startsWith('join/')) {
      pageTitle = t('app.titles.joinSession');
    } else if (cleanPath.startsWith('project/')) {
      pageTitle = projectName || t('app.titles.library');
    } else if (cleanPath === 'settings' || cleanPath.startsWith('settings/')) {
      pageTitle = t('app.titles.settings');
    } else if (cleanPath === 'reports') {
      pageTitle = t('app.titles.reports');
    } else if (cleanPath === 'guide') {
      pageTitle = t('app.titles.guide');
    } else if (cleanPath === 'verify-email') {
      pageTitle = t('app.titles.verifyEmail');
    } else if (cleanPath === 'feed') {
      pageTitle = t('app.titles.feed');
    } else if (cleanPath.startsWith('explore')) {
      pageTitle = t('app.titles.explore');
    } else if (cleanPath === 'search') {
      pageTitle = t('app.titles.search');
    } else if (cleanPath === 'leaderboard') {
      pageTitle = t('app.titles.leaderboard');
    } else if (cleanPath === 'notifications') {
      pageTitle = t('app.titles.notifications');
    } else if (/^[^/]+\/projects\/[^/]+(\/(edit|fork))?$/.test(cleanPath)) {
      // /:accountName/projects/:slug-:id[/edit|/fork]
      pageTitle = projectName || t('app.titles.library');
    } else if (rootAccount) {
      // /:accountName and /:accountName/lists/:listId. The hook runs above <Routes>, so useParams is empty here
      // and the account has to come from the pathname. An unknown account still gets its own not-found view from ProfilePage.
      pageTitle = rootAccount;
    } else {
      // Every real route is matched above, so what is left is the catch-all 404.
      pageTitle = t('app.titles.notFound');
    }

    if (pageTitle) {
      document.title = `${pageTitle} - ${appName}`;
    } else {
      document.title = appName;
    }
  }, [location.pathname, id, accountName, publicId, projectName, t]);
}
