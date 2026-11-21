import { use, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsContext } from '@/features/settings/settings-context-value';
import type { SettingsContextValue } from '@/features/settings/settings.types';
import { formatInTimezone, withHourCycle } from '@/shared/utils/date';

/**
 * Formats a date the way the user asked for in Settings → Advanced: their timezone and their
 * 12/24-hour clock, in the active language. Outside a SettingsProvider (isolated tests) it
 * falls back to the device zone and the language's clock.
 */
export function useDateTimeFormat() {
  const settings = (use(SettingsContext) as SettingsContextValue | null)?.settings;
  const { i18n } = useTranslation();
  const timezone: string | undefined = settings?.advanced?.timezone;
  const hourCycle: string | undefined = settings?.advanced?.hourCycle;
  const locale = i18n.resolvedLanguage || i18n.language || 'en';

  const formatDateTime = useCallback(
    (date: string | number | Date, options: Intl.DateTimeFormatOptions) =>
      formatInTimezone(new Date(date), timezone, withHourCycle(options, hourCycle), locale),
    [timezone, hourCycle, locale],
  );

  return { formatDateTime, timezone, hourCycle, locale };
}
