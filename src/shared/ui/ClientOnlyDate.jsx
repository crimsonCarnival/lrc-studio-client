import { useSyncExternalStore } from 'react';

function subscribe() {
  return () => {};
}

/**
 * A component that renders a date string only on the client to avoid hydration mismatches.
 * @param {object} props
 * @param {string|number|Date} props.date - The date to format
 * @param {Intl.DateTimeFormatOptions} props.options - Formatting options
 * @param {string} props.fallback - Fallback text while waiting for client render
 * @param {string} props.className - Optional CSS class
 */
export default function ClientOnlyDate({ date, options, fallback = '---', className = '' }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  if (!mounted || !date) {
    return <span className={className}>{fallback}</span>;
  }

  let formatted = fallback;
  try {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      formatted = d.toLocaleString(undefined, options);
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
