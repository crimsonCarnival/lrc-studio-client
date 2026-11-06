import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { formatCompactAgo } from './time-ago';

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
