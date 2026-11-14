import type { TFunction } from 'i18next';

/** "just now", "5 min ago", "3 h ago", "12 d ago". */
export function relativeTime(isoString: string, t: TFunction): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return t('library.justNow');
  if (mins < 60) return t('library.minutesAgo', { count: mins });
  if (hours < 24) return t('library.hoursAgo', { count: hours });
  return t('library.daysAgo', { count: days });
}
