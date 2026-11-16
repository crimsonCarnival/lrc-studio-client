import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { formatInTimezone } from '@/shared/utils/date';
import { getUsage } from './assist.service';
import type { HeavyUsage } from './assist.types';

/** Heavy assists (romanize, singers) refuse more lines than this; the server enforces the same cap. */
export const HEAVY_LINE_LIMIT = 200;
/** ...and reject the whole request when any single line is longer than this. */
export const HEAVY_LINE_MAX_CHARS = 500;

type ErrorShape = { code?: string; body?: { resetsAt?: unknown } };

/**
 * Tracks how many heavy assist runs are left today. Usage is fetched once, the first time `enabled`
 * is true; a failed fetch leaves `usage` null with no toast. Feed run responses into `setUsage` and
 * failures into `reportError`, which toasts a message for the error code.
 */
export function useHeavyUsage(enabled: boolean) {
  const { t, i18n } = useTranslation();
  const [usage, setUsage] = useState<HeavyUsage | null>(null);
  const [capped, setCapped] = useState(false);
  const fetched = useRef(false);
  const mounted = useRef(false);

  // Set in the effect body (not an initial value) so a StrictMode mount/cleanup/mount ends true.
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!enabled || fetched.current) return;
    fetched.current = true;
    getUsage().then((u) => { if (mounted.current) setUsage(u); }).catch(() => {});
  }, [enabled]);

  const update = useCallback((u: HeavyUsage) => {
    setUsage(u);
    setCapped(u.remaining <= 0);
  }, []);

  const reportError = useCallback((err: unknown) => {
    const { code, body } = (err ?? {}) as ErrorShape;
    if (code === 'assist_daily_cap') {
      setCapped(true);
      const at = typeof body?.resetsAt === 'string' ? body.resetsAt : undefined;
      const time = at ? formatInTimezone(at, undefined, { hour: '2-digit', minute: '2-digit' }, i18n.language) : '';
      toast.error(time ? t('editor.assist.errors.dailyCap', { time }) : t('editor.assist.errors.dailyCapNoTime'));
    } else if (code === 'assist_unavailable') {
      toast.error(t('editor.assist.errors.unavailable'));
    } else {
      toast.error(t('editor.assist.errors.upstream'));
    }
  }, [t, i18n.language]);

  return { usage, setUsage: update, exhausted: capped || usage?.remaining === 0, reportError };
}
