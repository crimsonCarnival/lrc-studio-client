import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/features/settings/useSettings';
import { getHourInTimezone } from '@/shared/utils/date';

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return Math.abs(hash);
}

export default function useDynamicTranslation(ns?: string) {
  const { t, i18n, ready } = useTranslation(ns as Parameters<typeof useTranslation>[0]);
  const { settings } = useSettings();
  const [baseSeed] = useState(() => Math.floor(Math.random() * 1000000));

  // Time of day logic, respecting the user's configured timezone override
  const [timeInfo] = useState(() => {
    const hour = getHourInTimezone(settings.advanced?.timezone);
    let period = 'morning';

    if (hour >= 12 && hour < 17) period = 'afternoon';
    else if (hour >= 17 && hour < 21) period = 'evening';
    else if (hour >= 21 || hour < 5) period = 'night';

    return { period };
  });

  const dt = useCallback((key: string, options: Record<string, unknown> = {}): string => {
    // Dynamic, runtime-built keys bypass the typed-resource key checking.
    const tk = t as unknown as (key: string, options?: Record<string, unknown>) => unknown;
    // 1. Attempt to find period-specific translations (e.g., "key.morning")
    const periodKey = `${key}.${timeInfo.period}`;
    const periodValue = tk(periodKey, { returnObjects: true, ...options });

    // Verify if it found a valid specific translation
    const hasPeriodSpecific = periodValue !== periodKey && periodValue !== undefined;

    // 2. Select the target (specific period or base key)
    const result: unknown = hasPeriodSpecific
      ? periodValue
      : tk(key, { returnObjects: true, ...options });

    if (Array.isArray(result) && result.length > 0) {
      // 3. Calculate seed with stability options
      // 'context' allows pinning the same random choice to a specific ID (like userId)
      const contextSeed = options.context ? hashString(String(options.context)) : 0;

      const seed = baseSeed + hashString(key) + contextSeed;
      let selected = result[seed % result.length];
      if (typeof selected === 'string') {
        Object.entries(options).forEach(([k, v]) => {
          selected = selected.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
        });
      }
      return selected as string;
    }

    // Fallback to standard t behavior if not an array
    return (typeof result === 'string' || typeof result === 'number')
      ? String(result)
      : (hasPeriodSpecific ? String(periodValue) : String(tk(key, options)));
  }, [t, baseSeed, timeInfo.period]);

  return { dt, t, i18n, ready, timeInfo };
}
