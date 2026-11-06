import { describe, expect, it } from 'vitest';
import {
  addDays, addMonths, daysInMonth, firstDayOfWeek, getZonedParts, monthGrid, resolveTimeZone, zonedPartsToDate,
} from './zoned-date';

describe('zoned date math', () => {
  it('reads wall-clock fields in the given zone', () => {
    const d = new Date('2026-11-06T02:30:00Z');
    expect(getZonedParts(d, 'America/Bogota')).toEqual({ year: 2026, month: 11, day: 5, hour: 21, minute: 30 });
    expect(getZonedParts(d, 'Asia/Tokyo')).toEqual({ year: 2026, month: 11, day: 6, hour: 11, minute: 30 });
  });

  it('round-trips wall clock to instant and back', () => {
    const parts = { year: 2026, month: 3, day: 14, hour: 9, minute: 5 };
    for (const tz of ['America/Bogota', 'Europe/Madrid', 'Asia/Kolkata', 'UTC']) {
      expect(getZonedParts(zonedPartsToDate(parts, tz), tz)).toEqual(parts);
    }
  });

  it('keeps wall time across a DST change', () => {
    // US spring-forward is 2026-03-08; noon on both sides must stay noon.
    for (const day of [7, 8, 9]) {
      const p = { year: 2026, month: 3, day, hour: 12, minute: 0 };
      expect(getZonedParts(zonedPartsToDate(p, 'America/New_York'), 'America/New_York')).toEqual(p);
    }
  });

  it('treats auto / empty / invalid zones as the device zone', () => {
    expect(resolveTimeZone('auto')).toBeUndefined();
    expect(resolveTimeZone('')).toBeUndefined();
    expect(resolveTimeZone('Not/AZone')).toBeUndefined();
    expect(resolveTimeZone('Europe/Madrid')).toBe('Europe/Madrid');
  });

  it('does calendar arithmetic without drifting', () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(addDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({ year: 2027, month: 1, day: 1 });
    expect(addMonths({ year: 2026, month: 1, day: 31 }, 1)).toEqual({ year: 2026, month: 2, day: 28 });
  });

  it('lays out a month as full weeks starting on the chosen weekday', () => {
    // Nov 2026 starts on a Sunday.
    const sun = monthGrid(2026, 11, 0);
    expect(sun[0][0]).toEqual({ year: 2026, month: 11, day: 1 });
    const mon = monthGrid(2026, 11, 1);
    expect(mon[0][0]).toEqual({ year: 2026, month: 10, day: 26 });
    for (const grid of [sun, mon]) {
      expect(grid.every((w) => w.length === 7)).toBe(true);
    }
  });

  it('knows the first weekday per locale', () => {
    expect(firstDayOfWeek('es')).toBe(1);
    expect(firstDayOfWeek('en-US')).toBe(0);
  });
});
