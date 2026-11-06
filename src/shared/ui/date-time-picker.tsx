import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { cn } from '@/shared/utils/utils';
import { useSettings } from '@/features/settings/useSettings';
import { formatInTimezone } from '@/shared/utils/date';
import {
  addDays,
  addMonths,
  compareDays,
  firstDayOfWeek,
  getZonedParts,
  monthGrid,
  resolveTimeZone,
  uses12HourClock,
  zonedPartsToDate,
} from '@/shared/utils/zoned-date';
import type { DateTimeParts, DayParts } from '@/shared/utils/zoned-date';

type DateTimePickerProps = {
  /** ISO instant, or null for "not set". */
  value: string | null;
  onChange: (iso: string | null) => void;
  /** Earliest selectable instant; days before it are disabled. Defaults to no limit. */
  min?: Date;
  /** Hide the time inputs and pick a day only (the instant is that day at 00:00). */
  dateOnly?: boolean;
  id?: string;
  placeholder?: string;
  'aria-label'?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Calendar popover for a date (and optionally time) that follows the app's date system:
 * wall-clock values are read and written in `settings.advanced.timezone` (not the device zone a
 * native datetime-local input is stuck with), and month/weekday names, first weekday and 12/24h
 * clock come from the active i18n language.
 */
export function DateTimePicker({
  value,
  onChange,
  min,
  dateOnly = false,
  id,
  placeholder,
  'aria-label': ariaLabel,
  disabled,
  className,
}: DateTimePickerProps) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const locale = i18n.resolvedLanguage || i18n.language || 'en';
  const timezone = settings.advanced?.timezone;
  const zoneLabel = resolveTimeZone(timezone) ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const twelveHour = useMemo(() => uses12HourClock(locale), [locale]);
  const weekStart = useMemo(() => firstDayOfWeek(locale), [locale]);

  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value) : null;
  const selectedParts: DateTimeParts | null =
    selected && !isNaN(selected.getTime()) ? getZonedParts(selected, timezone) : null;

  // What the popup is working on before "Done": a day + time in the configured zone.
  const [draft, setDraft] = useState<DateTimeParts>(() => selectedParts ?? defaultParts(timezone, min));
  const [view, setView] = useState<DayParts>(() => ({ ...draft, day: 1 }));
  const [focusDay, setFocusDay] = useState<DayParts>(draft);
  const gridRef = useRef<HTMLDivElement>(null);
  const shouldFocusGrid = useRef(false);
  const titleId = useId();

  const minDay = min ? getZonedParts(min, timezone) : null;
  const isDisabledDay = (d: DayParts) => (minDay ? compareDays(d, minDay) < 0 : false);
  const today = getZonedParts(new Date(), timezone);

  function handleOpenChange(next: boolean) {
    if (next) {
      const start = selectedParts ?? defaultParts(timezone, min);
      setDraft(start);
      setView({ ...start, day: 1 });
      setFocusDay(start);
    }
    setOpen(next);
  }

  // Move DOM focus to the roving-tabindex day after arrow-key navigation (and on open).
  useEffect(() => {
    if (!open || !shouldFocusGrid.current) return;
    gridRef.current?.querySelector<HTMLButtonElement>('[data-focus-day="true"]')?.focus();
    shouldFocusGrid.current = false;
  }, [open, focusDay, view]);

  function moveFocus(next: DayParts) {
    shouldFocusGrid.current = true;
    setFocusDay(next);
    if (next.year !== view.year || next.month !== view.month) setView({ ...next, day: 1 });
  }

  function onGridKeyDown(e: KeyboardEvent) {
    const step: Record<string, DayParts | undefined> = {
      ArrowLeft: addDays(focusDay, -1),
      ArrowRight: addDays(focusDay, 1),
      ArrowUp: addDays(focusDay, -7),
      ArrowDown: addDays(focusDay, 7),
      PageUp: addMonths(focusDay, e.shiftKey ? -12 : -1),
      PageDown: addMonths(focusDay, e.shiftKey ? 12 : 1),
    };
    const next = step[e.key];
    if (!next) return;
    e.preventDefault();
    moveFocus(next);
  }

  function pickDay(d: DayParts) {
    if (isDisabledDay(d)) return;
    const next = { ...draft, ...d };
    setDraft(next);
    setFocusDay(d);
    if (dateOnly) commit({ ...next, hour: 0, minute: 0 });
  }

  function commit(parts: DateTimeParts) {
    let at = zonedPartsToDate(parts, timezone);
    if (min && at < min) at = min; // a time earlier than `min` on its day snaps up to it
    onChange(at.toISOString());
    setOpen(false);
  }

  const monthTitle = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(view.year, view.month - 1, 1)));
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const dow = (weekStart + i) % 7;
    const ref = new Date(Date.UTC(2023, 0, 1 + dow)); // 2023-01-01 is a Sunday
    return {
      narrow: new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' }).format(ref),
      long: new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(ref),
    };
  });
  const dayLabel = (d: DayParts) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' })
      .format(new Date(Date.UTC(d.year, d.month - 1, d.day)));

  const triggerText = selected && selectedParts
    ? formatInTimezone(selected, timezone, dateOnly ? { dateStyle: 'medium' } : { dateStyle: 'medium', timeStyle: 'short' }, locale)
    : '';

  const hour12 = draft.hour % 12 === 0 ? 12 : draft.hour % 12;
  const isPm = draft.hour >= 12;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          className={cn(
            'flex h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-control)] border-0 bg-card px-3 text-left text-sm font-medium text-foreground inset-ring inset-ring-hl outline-none transition-shadow duration-[var(--duration-state)] hover:inset-ring-faint focus-visible:inset-ring-2 focus-visible:inset-ring-primary data-[state=open]:inset-ring-2 data-[state=open]:inset-ring-primary disabled:cursor-not-allowed disabled:opacity-50 lg:h-8',
            !triggerText && 'text-faint',
            className,
          )}
        >
          <span className="truncate">{triggerText || placeholder || t('common.datePicker.placeholder')}</span>
          <Icon name="calendar_month" size={16} className="shrink-0 text-subtle" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        role="dialog"
        aria-label={t('common.datePicker.dialog')}
        align="start"
        className="w-[19rem] max-w-[calc(100vw-2rem)] border-0 bg-popover p-3 text-popover-foreground ring-1 ring-foreground/10 lg:min-w-0"
      >
        <div className="mb-2 flex items-center justify-between">
          <Button
            type="button" variant="ghost" size="icon-sm"
            aria-label={t('common.datePicker.prevMonth')}
            onClick={() => { setView((v) => ({ ...addMonths(v, -1), day: 1 })); }}
          >
            <Icon name="chevron_left" size={18} />
          </Button>
          <div id={titleId} aria-live="polite" className="text-sm font-semibold capitalize">{monthTitle}</div>
          <Button
            type="button" variant="ghost" size="icon-sm"
            aria-label={t('common.datePicker.nextMonth')}
            onClick={() => { setView((v) => ({ ...addMonths(v, 1), day: 1 })); }}
          >
            <Icon name="chevron_right" size={18} />
          </Button>
        </div>

        <div ref={gridRef} role="grid" aria-labelledby={titleId} onKeyDown={onGridKeyDown}>
          <div role="row" className="grid grid-cols-7">
            {weekdays.map((w) => (
              <div key={w.long} role="columnheader" aria-label={w.long} className="py-1 text-center text-[11px] font-semibold uppercase text-faint">
                {w.narrow}
              </div>
            ))}
          </div>
          {monthGrid(view.year, view.month, weekStart).map((week, wi) => (
            <div key={wi} role="row" className="grid grid-cols-7">
              {week.map((d) => {
                const outside = d.month !== view.month;
                const isSelected = compareDays(d, draft) === 0;
                const isToday = compareDays(d, today) === 0;
                const isFocus = compareDays(d, focusDay) === 0;
                const off = isDisabledDay(d);
                return (
                  <div key={`${d.month}-${d.day}`} role="gridcell" aria-selected={isSelected} className="flex justify-center">
                    <button
                      type="button"
                      tabIndex={isFocus ? 0 : -1}
                      data-focus-day={isFocus}
                      disabled={off}
                      aria-label={dayLabel(d)}
                      aria-current={isToday ? 'date' : undefined}
                      onClick={() => pickDay(d)}
                      className={cn(
                        'size-9 rounded-full text-sm tabular-nums outline-none transition-colors coarse:size-10',
                        'hover:bg-raised focus-visible:ring-2 focus-visible:ring-primary',
                        outside && 'text-faint',
                        isToday && !isSelected && 'font-bold text-primary-ink inset-ring-1 inset-ring-primary',
                        isSelected && 'bg-primary font-semibold text-primary-foreground hover:bg-primary',
                        off && 'pointer-events-none opacity-30',
                      )}
                    >
                      {d.day}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {!dateOnly && (
          <div className="mt-3 flex items-center gap-2 border-t border-hl pt-3">
            <Icon name="schedule" size={16} className="text-subtle" />
            <TimeField
              label={t('common.datePicker.hour')}
              value={twelveHour ? hour12 : draft.hour}
              min={twelveHour ? 1 : 0}
              max={twelveHour ? 12 : 23}
              onCommit={(h) => setDraft((p) => ({ ...p, hour: twelveHour ? (h % 12) + (isPm ? 12 : 0) : h }))}
            />
            <span aria-hidden="true" className="text-subtle">:</span>
            <TimeField
              label={t('common.datePicker.minute')}
              value={draft.minute}
              min={0}
              max={59}
              onCommit={(m) => setDraft((p) => ({ ...p, minute: m }))}
            />
            {twelveHour && (
              <div role="group" aria-label={t('common.datePicker.meridiem')} className="ml-1 flex overflow-hidden rounded-lg inset-ring inset-ring-hl">
                {([false, true] as const).map((pm) => (
                  <button
                    key={String(pm)}
                    type="button"
                    aria-pressed={isPm === pm}
                    onClick={() => setDraft((p) => ({ ...p, hour: (p.hour % 12) + (pm ? 12 : 0) }))}
                    className={cn(
                      'h-8 px-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      isPm === pm ? 'bg-primary text-primary-foreground' : 'text-subtle hover:bg-raised',
                    )}
                  >
                    {pm ? t('common.datePicker.pm') : t('common.datePicker.am')}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="mt-2 text-[11px] text-faint">{t('common.datePicker.zone', { zone: zoneLabel.replace(/_/g, ' ') })}</p>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => { onChange(null); setOpen(false); }}>
              {t('common.clear')}
            </Button>
            <Button
              type="button" variant="ghost" size="sm"
              disabled={isDisabledDay(today)}
              onClick={() => { setDraft((p) => ({ ...p, ...today })); setView({ ...today, day: 1 }); moveFocus(today); }}
            >
              {t('common.datePicker.today')}
            </Button>
          </div>
          {!dateOnly && (
            <Button type="button" size="sm" onClick={() => commit(draft)}>
              {t('common.datePicker.done')}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Next sensible value when nothing is chosen: `min` if given (else now), at the top of the hour. */
function defaultParts(timezone: string | undefined, min?: Date): DateTimeParts {
  const base = min && min.getTime() > Date.now() ? min : new Date();
  const p = getZonedParts(base, timezone);
  return { ...p, minute: 0 };
}

type TimeFieldProps = { label: string; value: number; min: number; max: number; onCommit: (n: number) => void };

/** Two-digit numeric field that only commits a clamped integer, so half-typed text never reaches state. */
function TimeField({ label, value, min, max, onCommit }: TimeFieldProps) {
  const [text, setText] = useState<string | null>(null);
  const commit = () => {
    if (text !== null) {
      const n = parseInt(text, 10);
      if (!isNaN(n)) onCommit(Math.min(max, Math.max(min, n)));
    }
    setText(null);
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      maxLength={2}
      value={text ?? String(value).padStart(2, '0')}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setText(e.target.value.replace(/\D/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const delta = e.key === 'ArrowUp' ? 1 : -1;
          onCommit(value + delta > max ? min : value + delta < min ? max : value + delta);
          setText(null);
        }
      }}
      className="h-8 w-10 rounded-lg bg-card text-center font-mono text-sm tabular-nums text-foreground outline-none inset-ring inset-ring-hl focus-visible:inset-ring-2 focus-visible:inset-ring-primary"
    />
  );
}
