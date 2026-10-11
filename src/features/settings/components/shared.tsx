import React, { useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/utils/utils';
import { Kbd } from '@ui/kbd';
import { KEY_SYMBOLS } from '../key-symbols';

const SYMBOLS = KEY_SYMBOLS as Record<string, string>;

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
}

export function Section({ title, children, searchTerm }: SectionProps) {
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
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-6 pb-2 pt-4 contrast-more:border-zinc-600">
        <h2 className="text-xs font-bold uppercase tracking-[.09em] text-primary pb-1">
          {title}
        </h2>
        <div className="flex flex-col">
          {filteredChildren}
        </div>
      </div>
    </section>
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
export function UnitInput({ value, onChange, unit, label, min, max, step = 1, disabled }: {
  value: number;
  onChange: (value: number) => void;
  unit: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
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
    <label className="flex items-center gap-1.5 h-11 w-[104px] px-3 rounded-[10px] bg-zinc-950 border border-zinc-700 text-zinc-400 focus-within:border-primary/60">
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

interface ModifierInputProps {
  value?: string;
  onChange: (mod: string) => void;
  validateModifier?: (mod: string) => boolean;
}

export function ModifierInput({ value, onChange, validateModifier }: ModifierInputProps) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState(false);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') {
      setRecording(false);
      return;
    }
    let mod: string | null = null;
    if (e.key === 'Shift') mod = 'Shift';
    else if (e.key === 'Control') mod = 'Ctrl';
    else if (e.key === 'Alt') mod = 'Alt';
    else if (e.key === 'Meta') mod = 'Ctrl';
    else return;

    if (validateModifier && !validateModifier(mod)) {
      setError(true);
      setTimeout(() => setError(false), 800);
      setRecording(false);
      return;
    }
    onChange(mod);
    setRecording(false);
  };

  const displayVal = value ? (SYMBOLS[value] ?? value) : null;

  return (
    <div className="flex items-center gap-1.5">
      <button
        className={`px-2.5 py-1.5 rounded-lg min-w-[70px] flex items-center justify-center gap-0.5 transition-all outline-none ${
          error
            ? 'bg-red-500/20 border border-red-500 ring-2 ring-red-500/50'
            : recording
            ? 'bg-primary/10 border border-primary ring-2 ring-primary/40'
            : 'bg-zinc-800/60 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800'
        }`}
        onClick={() => setRecording(true)}
        onKeyDown={recording ? handleKeyDown : undefined}
        onBlur={() => setRecording(false)}
      >
        {error ? (
          <span className="text-red-400 text-xs font-medium">{t('settings.shortcuts.input.taken')}</span>
        ) : recording ? (
          <span className="text-primary text-xs animate-pulse font-medium">{t('settings.shortcuts.input.modifier')}</span>
        ) : displayVal ? (
          <Kbd className="bg-zinc-700/60 text-zinc-200 border border-zinc-600/50 h-auto px-1.5 py-0.5 text-xs">
            {displayVal}
          </Kbd>
        ) : (
          <span className="text-zinc-500 text-xs">{t('settings.shortcuts.input.none')}</span>
        )}
      </button>
      <span className="text-zinc-500 text-[10px]">{t('settings.shortcuts.input.plusClick')}</span>
    </div>
  );
}

interface ShortcutInputProps {
  value?: string;
  onChange: (key: string) => void;
  onValidate?: (key: string) => boolean;
  conflict?: string;
}

export function ShortcutInput({ value, onChange, onValidate, conflict }: ShortcutInputProps) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState(false);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') {
      setRecording(false);
      return;
    }
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

    const keyName = e.code === 'Space' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    parts.push(keyName);
    const newKey = parts.join('+');

    if (onValidate && !onValidate(newKey)) {
      setError(true);
      setTimeout(() => setError(false), 800);
      setRecording(false);
      return;
    }
    onChange(newKey);
    setRecording(false);
  };

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        className={`px-2.5 py-1.5 rounded-lg min-w-[80px] flex items-center justify-center gap-0.5 transition-all outline-none ${
          error
            ? 'bg-red-500/20 border border-red-500 ring-2 ring-red-500/50'
            : conflict
            ? 'border border-amber-500/70 bg-amber-500/10'
            : recording
            ? 'bg-primary/10 border border-primary ring-2 ring-primary/40'
            : 'bg-zinc-800/60 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800'
        }`}
        onClick={() => setRecording(true)}
        onKeyDown={recording ? handleKeyDown : undefined}
        onBlur={() => setRecording(false)}
      >
        {error ? (
          <span className="text-red-400 text-xs font-medium">{t('settings.shortcuts.input.taken')}</span>
        ) : recording ? (
          <span className="text-primary text-xs animate-pulse font-medium">{t('settings.shortcuts.input.pressKey')}</span>
        ) : value ? (
          value.split(/(?<=.)\+/).map((part, idx) => (
            <React.Fragment key={part}>
              {idx > 0 && <span className="text-zinc-600 text-[10px] mx-0.5">+</span>}
              <Kbd className="bg-zinc-700/60 text-zinc-200 border border-zinc-600/50 h-auto px-1.5 py-0.5 text-xs">
                {SYMBOLS[part] ?? part}
              </Kbd>
            </React.Fragment>
          ))
        ) : (
          <span className="text-zinc-500 text-xs">{t('settings.shortcuts.input.none')}</span>
        )}
      </button>
      {conflict && (
        <span className="text-[10px] text-amber-400 font-medium leading-none">
          ⚠ {conflict}
        </span>
      )}
    </div>
  );
}
