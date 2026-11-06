import { useTranslation } from 'react-i18next';
import { useEffectiveTimeZone } from '@/shared/hooks/useTimezoneSync';

/**
 * Streak days follow the user's own timezone (the server counts them in the zone this app sends
 * it, see useTimezoneSync). Returns the localized hint "Days reset at midnight (America/Bogota)".
 * Shared by every place that displays the streak.
 */
export function useStreakResetHint(): string {
  const { t } = useTranslation();
  const zone = useEffectiveTimeZone();
  return t('profile.streakResetHint', { zone: zone.replace(/_/g, ' ') });
}
