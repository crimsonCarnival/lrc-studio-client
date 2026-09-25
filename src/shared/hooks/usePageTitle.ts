import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';

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
    let pageTitle = '';

    const path = location.pathname;

    // Remove leading/trailing slashes for easier matching
    const cleanPath = path.replace(/^\/|\/$/g, '');

    if (cleanPath === 'home' || cleanPath === '') {
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
    } else if (cleanPath === 'admin') {
      pageTitle = t('app.titles.admin');
    } else if (cleanPath.startsWith('share/')) {
      pageTitle = projectName || t('app.titles.shared');
    } else if (cleanPath === 'project/new') {
      pageTitle = t('app.titles.newProject');
    } else if (cleanPath.startsWith('project/')) {
      pageTitle = projectName || t('app.titles.library');
    } else if (cleanPath === 'settings') {
      pageTitle = t('app.titles.settings');
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
    }

    if (pageTitle) {
      document.title = `${appName} - ${pageTitle}`;
    } else {
      document.title = appName;
    }
  }, [location.pathname, id, accountName, publicId, projectName, t]);
}
