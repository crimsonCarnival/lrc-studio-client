/**
 * Wall-clock date math for the date picker, done in an explicit IANA timezone.
 *
 * The app's date system is `settings.advanced.timezone` ('auto' = the device's zone) plus the
 * active i18n language. A native <input type="datetime-local"> ignores both: it always works in
 * the device zone and the browser's locale. These helpers let the picker show and produce
 * instants as the user's configured zone sees them.
 */

export type DayParts = { year: number; month: number; day: number }; // month is 1-12
export type DateTimeParts = DayParts & { hour: number; minute: number };

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string | undefined): Intl.DateTimeFormat {
  const key = timeZone ?? '';
  let f = formatterCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
    formatterCache.set(key, f);
  }
  return f;
}

/** 'auto' / empty / an invalid zone all mean the device zone. */
export function resolveTimeZone(timezone: string | undefined | null): string | undefined {
  if (!timezone || timezone === 'auto') return undefined;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return timezone;
  } catch {
    return undefined;
  }
}

/** The wall-clock fields `date` shows in `timezone`. */
export function getZonedParts(date: Date, timezone: string | undefined | null): DateTimeParts {
  const out: Record<string, number> = {};
  for (const p of partsFormatter(resolveTimeZone(timezone)).formatToParts(date)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return { year: out.year, month: out.month, day: out.day, hour: out.hour % 24, minute: out.minute };
}

/**
 * The instant at which `timezone`'s wall clock reads `parts`. Starts from the parts read as UTC,
 * then corrects by the zone's offset at that point; a second pass settles dates next to a DST
 * change. A wall time that does not exist (spring-forward gap) lands on the nearest valid instant.
 */
export function zonedPartsToDate(parts: DateTimeParts, timezone: string | undefined | null): Date {
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  let guess = asUtc;
  for (let i = 0; i < 2; i++) {
    const seen = getZonedParts(new Date(guess), timezone);
    const seenAsUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute);
    guess += asUtc - seenAsUtc;
  }
  return new Date(guess);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Compares calendar days; negative when a is earlier. */
export function compareDays(a: DayParts, b: DayParts): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

export function addDays(d: DayParts, n: number): DayParts {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + n));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

export function addMonths(d: DayParts, n: number): DayParts {
  const t = new Date(Date.UTC(d.year, d.month - 1 + n, 1));
  const year = t.getUTCFullYear();
  const month = t.getUTCMonth() + 1;
  return { year, month, day: Math.min(d.day, daysInMonth(year, month)) };
}

/**
 * First day of the week for a locale as 0 (Sunday) to 6 (Saturday). Reads Intl's week data where
 * the engine exposes it; otherwise Sunday, which is right for English and wrong only for locales
 * the app does not ship.
 */
export function firstDayOfWeek(locale: string): number {
  try {
    const loc = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const info = loc.getWeekInfo?.() ?? loc.weekInfo;
    if (info) return info.firstDay % 7; // Intl uses 1 (Mon) to 7 (Sun)
  } catch {
    // fall through
  }
  return 0;
}

/** True when the locale writes the time on a 12-hour clock (AM/PM). */
export function uses12HourClock(locale: string): boolean {
  try {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12 === true;
  } catch {
    return false;
  }
}

/** Weeks of a month as rows of 7 days; leading/trailing cells belong to the adjacent months. */
export function monthGrid(year: number, month: number, weekStart: number): DayParts[][] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const lead = (firstWeekday - weekStart + 7) % 7;
  const start = addDays({ year, month, day: 1 }, -lead);
  const weeks = Math.ceil((lead + daysInMonth(year, month)) / 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)),
  );
}
