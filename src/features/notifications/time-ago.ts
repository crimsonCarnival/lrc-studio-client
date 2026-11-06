import type { TFunction } from 'i18next';
import { formatInTimezone } from '@/shared/utils/date';

export function formatTimeAgo(createdAt: string | number | Date, t: TFunction, timezone?: string, locale?: string) {
  const seconds = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (seconds < 30) return t('notifications.timeJustNow');
  if (seconds < 3600) return t('notifications.timeMinutes', { n: Math.floor(seconds / 60) });
  if (seconds < 86400) return t('notifications.timeHours', { n: Math.floor(seconds / 3600) });
  if (seconds < 604800) return t('notifications.timeDays', { n: Math.floor(seconds / 86400) });
  return formatInTimezone(createdAt, timezone, {}, locale);
}

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * "just now", "5s", "3m", "2h", "4d", "2w", "5mo", "1y": the shortest form, with no "ago".
 * Computed once per render; it is not meant to tick. Pair it with {@link formatFullDateTime} in a tooltip.
 */
export function formatCompactAgo(when: string | number | Date, t: TFunction): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(when).getTime()) / 1000));
  if (seconds < 5) return t('notifications.compactNow');
  if (seconds < MINUTE) return t('notifications.compactSeconds', { n: seconds });
  if (seconds < HOUR) return t('notifications.compactMinutes', { n: Math.floor(seconds / MINUTE) });
  if (seconds < DAY) return t('notifications.compactHours', { n: Math.floor(seconds / HOUR) });
  if (seconds < WEEK) return t('notifications.compactDays', { n: Math.floor(seconds / DAY) });
  if (seconds < MONTH) return t('notifications.compactWeeks', { n: Math.floor(seconds / WEEK) });
  if (seconds < YEAR) return t('notifications.compactMonths', { n: Math.floor(seconds / MONTH) });
  return t('notifications.compactYears', { n: Math.floor(seconds / YEAR) });
}

/** The full date and time, in the user's timezone and language. */
export function formatFullDateTime(when: string | number | Date, timezone?: string, locale?: string): string {
  return formatInTimezone(new Date(when), timezone, { dateStyle: 'long', timeStyle: 'medium' }, locale);
}
