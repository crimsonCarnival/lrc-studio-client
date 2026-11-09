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

const ENGLISH_ORDINALS = new Intl.PluralRules('en', { type: 'ordinal' });
const ORDINAL_SUFFIX: Record<string, string> = { one: 'st', two: 'nd', few: 'rd', other: 'th' };

/** The user's date display choices (`settings.advanced`); every field is optional and falls back to its default. */
export type DateDisplayPrefs = {
  timezone?: string;
  hourCycle?: string;
  dateStyle?: string;
  showUtcOffset?: boolean;
};

/**
 * The full date and time in the user's timezone and language.
 * Long: "October 26th at 6:45:31 PM GMT-5" / "el 26 de octubre a las 18:45:31 GMT-5"; the year is
 * left out when it is the current one (in that timezone). Short: "10/26/2026, 6:45:31 PM GMT-5".
 * `hourCycle` forces a 12 or 24-hour clock and `showUtcOffset` drops the GMT offset.
 */
export function formatFullDateTime(when: string | number | Date, prefs: DateDisplayPrefs = {}, locale?: string): string {
  const { timezone, hourCycle = 'auto', dateStyle = 'long', showUtcOffset = true } = prefs;
  const date = new Date(when);
  const zoned = (options: Intl.DateTimeFormatOptions) => formatInTimezone(date, timezone, options, locale);

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    ...(hourCycle === '12' && { hourCycle: 'h12' as const }),
    ...(hourCycle === '24' && { hourCycle: 'h23' as const }),
    ...(showUtcOffset && { timeZoneName: 'shortOffset' as const }),
  };
  // Spanish wraps the offset in parentheses, "(GMT-5)"; drop them so both languages read the same.
  const clean = (text: string) => text.replace(/\((GMT[^)]*)\)/, '$1');

  if (dateStyle === 'short') {
    return clean(zoned({ day: 'numeric', month: 'numeric', year: 'numeric', ...timeOptions }));
  }

  const year = zoned({ year: 'numeric' });
  const showYear = year !== formatInTimezone(new Date(), timezone, { year: 'numeric' }, locale);
  const month = zoned({ month: 'long' });
  const day = zoned({ day: 'numeric' });
  const time = clean(zoned(timeOptions));

  if (locale?.startsWith('es')) {
    const at = /^0?1:/.test(time) ? 'a la' : 'a las'; // "a la 1:05", but "a las 11:05"
    return `el ${day} de ${month}${showYear ? ` de ${year}` : ''} ${at} ${time}`;
  }
  const ordinal = ORDINAL_SUFFIX[ENGLISH_ORDINALS.select(parseInt(day, 10))];
  return `${month} ${day}${ordinal}${showYear ? `, ${year}` : ''} at ${time}`;
}
