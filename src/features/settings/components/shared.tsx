import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';

export function Toggle({ checked, onChange, id, disabled, label }: { checked?: boolean; onChange?: (checked: boolean) => void; id?: string; disabled?: boolean; label?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative shrink-0 flex items-center w-[52px] h-[30px] p-[3px] rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 coarse:after:content-[''] coarse:after:absolute coarse:after:-inset-2",
        checked ? 'bg-primary' : 'bg-zinc-700',
      )}
    >
      <span className={cn('block size-6 rounded-full transition-transform', checked ? 'translate-x-[22px] bg-zinc-900' : 'translate-x-0 bg-zinc-400')} />
    </button>
  );
}

interface SettingRowProps {
  label?: ReactNode;
  description?: ReactNode;
  /** Kept for call-site compatibility; rows no longer render an icon. */
  iconName?: string;
  /** Indents the row under its parent setting. */
  nested?: boolean;
  disabled?: boolean;
  children?: ReactNode;
}

export function SettingRow({ label, description, nested, disabled, children }: SettingRowProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-5 gap-y-3 py-4 [&+&]:border-t [&+&]:border-zinc-800', disabled && 'opacity-45')}>
      <div className={cn('flex-1 basis-72 min-w-0', nested && 'pl-[18px] border-l-2 border-zinc-800')}>
        <p className="text-[15px] font-semibold text-zinc-100 leading-snug">{label}</p>
        {description && (
          <p className="text-[13px] text-zinc-400 mt-[3px] leading-relaxed">{description}</p>
        )}
      </div>
      {children != null && <div className="shrink-0 max-w-full">{children}</div>}
    </div>
  );
}

interface SectionProps {
  title?: ReactNode;
  /** Kept for call-site compatibility; section headers no longer render an icon. */
  iconName?: string;
  children?: ReactNode;
  searchTerm?: string;
  color?: string;
  /** Rendered at the right of the section title (e.g. a bulk action button). */
  action?: ReactNode;
  /** `danger` tints the card border and title red (destructive actions). */
  tone?: 'default' | 'danger';
}

export function Section({ title, children, searchTerm, action, tone = 'default' }: SectionProps) {
  const filteredChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;

    if (searchTerm) {
      const normalize = (str: unknown) =>
        String(str).toLowerCase().replace(/[\s-]/g, '');

      const childProps = child.props as { label?: unknown; description?: unknown };
      const label =
        typeof childProps.label === 'string'
          ? childProps.label
          : (childProps.label as { props?: { children?: unknown } } | undefined)?.props?.children || '';
      const desc =
        typeof childProps.description === 'string' ? childProps.description : '';

      const normalizedLabel = normalize(label);
      const normalizedDesc = normalize(desc);
      const searchTokens = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);

      const match = searchTokens.every(token => {
        const normalizedToken = normalize(token);
        return normalizedLabel.includes(normalizedToken) || normalizedDesc.includes(normalizedToken);
      });

      if (!match) return null;
    }

    return child;
  });

  if (searchTerm && !filteredChildren?.some(Boolean)) return null;

  return (
    <section className={`settings-section ${searchTerm ? 'animate-fade-in' : ''}`}>
      <div className={cn('rounded-2xl border bg-zinc-900 px-6 pb-2 pt-4 contrast-more:border-zinc-600', tone === 'danger' ? 'border-red-950' : 'border-zinc-800')}>
        <div className="flex items-center justify-between gap-3 pb-1">
          <h2 className={cn('text-xs font-bold uppercase tracking-[.09em]', tone === 'danger' ? 'text-red-300' : 'text-primary')}>{title}</h2>
          {action}
        </div>
        <div className="flex flex-col">
          {filteredChildren}
        </div>
      </div>
    </section>
  );
}

/** Dropdown with the settings look; pass `SettingOption`s as children. */
export function SettingSelect({ value, onValueChange, label, children, className }: {
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={label}
        className={cn('bg-zinc-950 border-zinc-700 text-sm text-zinc-100 focus:border-primary/50 h-11 w-auto min-w-[170px] rounded-[10px]', className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-zinc-900 border-zinc-700">{children}</SelectContent>
    </Select>
  );
}
export const SettingOption = SelectItem;

/** Row with a leading icon chip, used for sign-in methods and sessions. */
export function IconRow({ icon, iconClassName, title, badge, description, children, className }: {
  icon: ReactNode;
  iconClassName?: string;
  title: ReactNode;
  badge?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-5 gap-y-3 py-4 [&+&]:border-t [&+&]:border-zinc-800', className)}>
      <div className="flex flex-1 basis-72 min-w-0 items-center gap-3.5">
        <span className={cn('size-11 shrink-0 grid place-items-center rounded-xl bg-zinc-800 text-primary', iconClassName)}>{icon}</span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-zinc-100 flex items-center gap-1.5 flex-wrap">{title}{badge}</p>
          {description && <div className="text-[13px] text-zinc-400 mt-[3px] leading-relaxed">{description}</div>}
        </div>
      </div>
      {children != null && <div className="shrink-0 flex items-center gap-3.5">{children}</div>}
    </div>
  );
}

/** Small pill used next to row titles ("Conectado", "Este dispositivo"). */
export function Chip({ children, tone = 'violet' }: { children: ReactNode; tone?: 'violet' | 'teal' }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold', tone === 'teal' ? 'bg-teal-950 text-teal-300' : 'bg-zinc-800 text-violet-200')}>
      {children}
    </span>
  );
}

/** A plain settings card without a section title (e.g. a lone toggle). */
export function SettingsPanelCard({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <section className={cn('settings-section rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-2 contrast-more:border-zinc-600', className)}>
      {children}
    </section>
  );
}

export interface SegmentedOption<T extends string> { value: T; label: ReactNode }

/** Radio-group style pill selector; the selected option is highlighted. */
export function SegmentedControl<T extends string>({ value, options, onChange, label, disabled }: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex gap-0.5 p-[3px] rounded-[10px] bg-zinc-950 border border-zinc-700', disabled && 'opacity-50 pointer-events-none')}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              'h-9 px-4 rounded-lg text-sm font-semibold transition-colors coarse:h-11',
              on ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Numeric input with a trailing unit (×, s, …). */
export function UnitInput({ value, onChange, unit, label, min, max, step = 1, disabled, className }: {
  value: number;
  onChange: (value: number) => void;
  unit: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}) {
  // Keep the raw text while typing so "0." / "" don't fight the controlled number.
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const n = parseFloat(draft.replace(',', '.'));
    if (!Number.isNaN(n)) onChange(n);
    setDraft(null);
  };
  return (
    <label className={cn('flex items-center gap-1.5 h-11 w-[104px] px-3 rounded-[10px] bg-zinc-950 border border-zinc-700 text-zinc-400 focus-within:border-primary/60', disabled && 'opacity-50', className)}>
      <span className="sr-only">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        aria-valuemin={min}
        aria-valuemax={max}
        data-step={step}
        disabled={disabled}
        value={draft ?? String(value).replace('.', ',')}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        className="flex-1 min-w-0 bg-transparent border-none outline-none text-right font-mono text-zinc-100"
      />
      <span aria-hidden="true" className="font-mono text-sm">{unit}</span>
    </label>
  );
}

/** Range slider with a trailing percentage readout. */
export function PercentSlider({ value, onChange, label, step = 5, min = 0 }: { value: number; onChange: (value: number) => void; label: string; step?: number; min?: number }) {
  return (
    <label className="flex items-center gap-4">
      <span className="sr-only">{label}</span>
      <input
        type="range"
        min={min}
        max={100}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-40 sm:w-[324px] accent-primary cursor-pointer"
      />
      <output className="w-12 text-right font-mono text-zinc-100">{value}%</output>
    </label>
  );
}
