import { formatInTimezone } from '@/shared/utils/date';

export function formatTimeAgo(createdAt, t, timezone, locale) {
  const seconds = Math.floor((Date.now() - new Date(createdAt)) / 1000);
  if (seconds < 30) return t('notifications.timeJustNow');
  if (seconds < 3600) return t('notifications.timeMinutes', { n: Math.floor(seconds / 60) });
  if (seconds < 86400) return t('notifications.timeHours', { n: Math.floor(seconds / 3600) });
  if (seconds < 604800) return t('notifications.timeDays', { n: Math.floor(seconds / 86400) });
  return formatInTimezone(createdAt, timezone, {}, locale);
}
