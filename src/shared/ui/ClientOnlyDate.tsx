import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/features/settings/useSettings';
import { formatInTimezone } from '@/shared/utils/date';

function subscribe() {
  return () => {};
}

interface ClientOnlyDateProps {
  date?: string | number | Date | null;
  options?: Intl.DateTimeFormatOptions;
  fallback?: string;
  className?: string;
  /** IANA timezone override; defaults to the user's setting */
  timezone?: string;
}

/**
 * A component that renders a date string only on the client to avoid hydration mismatches.
 * Honors the user's configured timezone override (settings.advanced.timezone) unless an
 * explicit `timezone` prop is passed.
 */
export default function ClientOnlyDate({ date, options, fallback = '---', className = '', timezone }: ClientOnlyDateProps) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const { settings } = useSettings();
  const { i18n } = useTranslation();

  if (!mounted || !date) {
    return <span className={className}>{fallback}</span>;
  }

  const effectiveTimezone = timezone ?? settings.advanced?.timezone;
  const locale = i18n.resolvedLanguage || i18n.language;

  let formatted = fallback;
  try {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      formatted = formatInTimezone(d, effectiveTimezone, options, locale);
    }
  } catch {
    // fallback
  }

  return (
    <span className={className}>
      {formatted}
    </span>
  );
}
