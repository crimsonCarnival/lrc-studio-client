import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { formatCompactAgo, formatFullDateTime } from './time-ago';

// Echoes the key and count, so the test checks which unit was chosen, not the wording.
const t = ((key: string, opts?: { n?: number }) => (opts?.n === undefined ? key : `${key}:${opts.n}`)) as unknown as TFunction;

describe('formatCompactAgo', () => {
  const now = new Date('2026-11-06T12:00:00Z').getTime();
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
  afterEach(() => vi.useRealTimers());

  const ago = (seconds: number) => formatCompactAgo(now - seconds * 1000, t);

  it('says just now for the first few seconds, and for a clock-skewed future time', () => {
    expect(ago(0)).toBe('notifications.compactNow');
    expect(ago(4)).toBe('notifications.compactNow');
    expect(formatCompactAgo(now + 60_000, t)).toBe('notifications.compactNow');
  });

  it('steps through seconds, minutes, hours, days, weeks, months and years', () => {
    expect(ago(5)).toBe('notifications.compactSeconds:5');
    expect(ago(59)).toBe('notifications.compactSeconds:59');
    expect(ago(60)).toBe('notifications.compactMinutes:1');
    expect(ago(3600)).toBe('notifications.compactHours:1');
    expect(ago(86400)).toBe('notifications.compactDays:1');
    expect(ago(7 * 86400)).toBe('notifications.compactWeeks:1');
    expect(ago(30 * 86400)).toBe('notifications.compactMonths:1');
    expect(ago(365 * 86400)).toBe('notifications.compactYears:1');
    expect(ago(800 * 86400)).toBe('notifications.compactYears:2');
  });
});

describe('formatFullDateTime', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-09T12:00:00Z').getTime()); });
  afterEach(() => vi.useRealTimers());

  const when = '2026-10-26T23:45:31Z'; // 6:45:31 PM in Bogota

  it('writes the ordinal day and a GMT offset in English, with no year for the current year', () => {
    expect(formatFullDateTime(when, { timezone: 'America/Bogota' }, 'en')).toBe('October 26th at 6:45:31 PM GMT-5');
  });

  it('writes the Spanish form', () => {
    expect(formatFullDateTime(when, { timezone: 'America/Bogota' }, 'es')).toMatch(/^el 26 de octubre a las .*GMT-5$/);
  });

  it('keeps the year for another year', () => {
    expect(formatFullDateTime('2025-10-02T23:45:31Z', { timezone: 'America/Bogota' }, 'en')).toBe('October 2nd, 2025 at 6:45:31 PM GMT-5');
    expect(formatFullDateTime('2025-10-02T23:45:31Z', { timezone: 'America/Bogota' }, 'es')).toMatch(/^el 2 de octubre de 2025 a las /);
  });

  it('judges the year in the given timezone', () => {
    // 2026-01-01 03:00Z is still 2025 in Bogota.
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
    expect(formatFullDateTime('2026-01-01T03:00:00Z', { timezone: 'America/Bogota' }, 'en')).toContain('2025');
  });

  it('honours the 12/24-hour choice in either language', () => {
    expect(formatFullDateTime(when, { timezone: 'America/Bogota', hourCycle: '24' }, 'en')).toBe('October 26th at 18:45:31 GMT-5');
    expect(formatFullDateTime(when, { timezone: 'America/Bogota', hourCycle: '12' }, 'es')).toMatch(/a las 6:45:31\s?p\. ?m\. GMT-5$/);
  });

  it('drops the offset on request', () => {
    expect(formatFullDateTime(when, { timezone: 'America/Bogota', showUtcOffset: false }, 'en')).toBe('October 26th at 6:45:31 PM');
  });

  it('writes the short style with the year, and honours the other choices', () => {
    const bogota = { timezone: 'America/Bogota', dateStyle: 'short' };
    expect(formatFullDateTime(when, bogota, 'en')).toBe('10/26/2026, 6:45:31 PM GMT-5');
    expect(formatFullDateTime(when, { ...bogota, hourCycle: '24', showUtcOffset: false }, 'es')).toBe('26/10/2026, 18:45:31');
  });
});
