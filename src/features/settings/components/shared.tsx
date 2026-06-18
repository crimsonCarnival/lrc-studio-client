import React, { useState } from 'react';
import type { ComponentType, KeyboardEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@ui/switch';
import { Kbd } from '@ui/kbd';
import { KEY_SYMBOLS } from '../key-symbols';

const SYMBOLS = KEY_SYMBOLS as Record<string, string>;

export function Toggle({ checked, onChange, id }: { checked?: boolean; onChange?: (checked: boolean) => void; id?: string }) {
  return (
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      className="data-[state=checked]:bg-primary"
    />
  );
}

const ICON_COLORS: Record<string, string> = {
  default: 'bg-primary/10 text-primary',
  teal:    'bg-accent-blue/10 text-accent-blue',
  amber:   'bg-warning/10 text-warning',
  rose:    'bg-rose-400/10 text-rose-400',
  green:   'bg-emerald-400/10 text-emerald-400',
};

interface SettingRowProps {
  label?: ReactNode;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  children?: ReactNode;
}

export function SettingRow({ label, description, icon: Icon, children }: SettingRowProps) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.018] group [&+&]:border-t [&+&]:border-border/40">
      {Icon && (
        <div className="size-8 rounded-lg bg-white/[0.03] flex items-center justify-center flex-shrink-0">
          <Icon className="size-3.5 text-zinc-500 group-hover:text-zinc-400 transition-colors" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-zinc-200 leading-snug contrast-more:text-white">{label}</p>
        {description && (
          <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-relaxed contrast-more:text-zinc-300">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0 ml-4">{children}</div>
    </div>
  );
}

interface SectionProps {
  title?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  children?: ReactNode;
  searchTerm?: string;
  color?: string;
}

export function Section({ title, icon: Icon, children, searchTerm, color = 'default' }: SectionProps) {
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

  const iconCls = ICON_COLORS[color] ?? ICON_COLORS.default;

  return (
    <div className={`settings-section mb-4 ${searchTerm ? 'animate-fade-in' : ''}`}>
      <div className="rounded-2xl border border-border/60 overflow-hidden hover:border-border/80 transition-colors bg-secondary/5 contrast-more:border-zinc-600">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border/40 contrast-more:border-zinc-600">
          {Icon && (
            <div className={`size-[22px] rounded-md flex items-center justify-center flex-shrink-0 ${iconCls}`}>
              <Icon className="size-3" />
            </div>
          )}
          <h4 className="font-heading text-[13px] font-semibold tracking-tight text-zinc-200 contrast-more:text-white">
            {title}
          </h4>
        </div>
        <div className="flex flex-col">
          {filteredChildren}
        </div>
      </div>
    </div>
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
