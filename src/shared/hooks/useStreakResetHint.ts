import { useTranslation } from 'react-i18next';
import { useSettings } from '@/features/settings/useSettings';
import { formatInTimezone } from '@/shared/utils/date';

/**
 * Streak days roll over at 00:00 UTC for every user (server-defined). Returns
 * the localized hint "Resets at 00:00 UTC (7:00 PM your time)" using the user's
 * configured timezone (settings.advanced.timezone, 'auto' = browser).
 * Shared by every place that displays the streak.
 */
export function useStreakResetHint(): string {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const now = new Date();
  const nextUtcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const time = formatInTimezone(
    nextUtcMidnight,
    settings.advanced?.timezone,
    { hour: 'numeric', minute: '2-digit' },
    i18n.resolvedLanguage || i18n.language,
  );
  return t('profile.streakResetHint', { time });
}
