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
    const appName = t('app.name') || 'LRC Studio';
    let pageTitle = '';

    const path = location.pathname;

    // Remove leading/trailing slashes for easier matching
    const cleanPath = path.replace(/^\/|\/$/g, '');

    if (cleanPath === 'home' || cleanPath === '') {
      pageTitle = t('app.titles.home', 'Home');
    } else if (cleanPath === 'library' || cleanPath === 'projects') {
      pageTitle = t('app.titles.library', 'Library');
    } else if (cleanPath.startsWith('uploads')) {
      pageTitle = projectName || t('app.titles.uploads', 'Uploads');
    } else if (cleanPath.startsWith('profile/') || cleanPath.startsWith('u/')) {
      pageTitle = accountName || t('app.titles.profile', 'Profile');
    } else if (cleanPath === 'profile') {
      pageTitle = t('app.titles.profile', 'Profile');
    } else if (cleanPath.startsWith('auth')) {
      pageTitle = t('app.titles.auth', 'Auth');
    } else if (cleanPath === 'admin') {
      pageTitle = t('app.titles.admin', 'Admin');
    } else if (cleanPath.startsWith('share/')) {
      pageTitle = projectName || t('app.titles.shared', 'Shared Project');
    } else if (cleanPath === 'project/new') {
      pageTitle = t('app.titles.newProject', 'New Project');
    } else if (cleanPath.startsWith('project/')) {
      pageTitle = projectName || t('app.titles.library', 'Project');
    } else if (cleanPath === 'settings') {
      pageTitle = t('app.titles.settings', 'Settings');
    } else if (cleanPath === 'feed') {
      pageTitle = t('app.titles.feed', 'Feed');
    } else if (cleanPath.startsWith('explore')) {
      pageTitle = t('app.titles.explore', 'Explore');
    } else if (cleanPath === 'search') {
      pageTitle = t('app.titles.search', 'Search');
    } else if (cleanPath === 'leaderboard') {
      pageTitle = t('app.titles.leaderboard', 'Leaderboard');
    } else if (cleanPath === 'notifications') {
      pageTitle = t('app.titles.notifications', 'Notifications');
    }

    if (pageTitle) {
      document.title = `${appName} - ${pageTitle}`;
    } else {
      document.title = appName;
    }
  }, [location.pathname, id, accountName, publicId, projectName, t]);
}
