import { useEffect, useRef } from 'react';
import { useSettings } from '@/features/settings/useSettings';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { setTimezone } from '@/features/settings/services/preferences.service';
import { resolveTimeZone } from '@/shared/utils/zoned-date';

/**
 * The IANA zone the app's dates use: the timezone setting, or the device's own zone when it is
 * 'auto'. Streak and heatmap days are counted by the server in this zone.
 */
export function useEffectiveTimeZone(): string {
  const { settings } = useSettings();
  return resolveTimeZone(settings.advanced?.timezone) ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Tells the server which timezone the signed-in user's days follow. It cannot know on its own:
 * 'auto' means "whatever this device says". Runs once per sign-in and again whenever the
 * effective zone changes (a setting edit, or travelling with 'auto').
 */
export function useTimezoneSync(): void {
  const { user } = useAuthContext();
  const userId = user?.id ?? null;
  const zone = useEffectiveTimeZone();
  const pushed = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      pushed.current = null;
      return;
    }
    const key = `${userId}:${zone}`;
    if (pushed.current === key) return;
    pushed.current = key;
    // Best-effort: the server falls back to UTC, and the next change or sign-in retries.
    setTimezone(zone).catch(() => { pushed.current = null; });
  }, [userId, zone]);
}
