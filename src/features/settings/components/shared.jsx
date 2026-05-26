import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@ui/switch';
import { Kbd } from '@ui/kbd';
import { KEY_SYMBOLS } from '../key-symbols';

export function Toggle({ checked, onChange, id }) {
  return (
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      className="data-[state=checked]:bg-primary"
    />
  );
}

export function SettingRow({ label, description, icon: Icon, children }) {
  return (
    <div className="flex flex-col justify-between gap-4 p-5 rounded-2xl border border-border/50 bg-secondary/10 hover:border-border transition-all group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-2">
          {Icon && <Icon className="size-4 text-zinc-400 shrink-0 group-hover:text-primary transition-colors" />}
          {label}
        </p>
        {description && <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>}
      </div>
      <div className="flex justify-end items-end mt-auto pt-2">
        {children}
      </div>
    </div>
  );
}

export function Section({ title, icon: Icon, children, searchTerm }) {
  const filteredChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;

    if (searchTerm) {
      const normalize = (str) =>
        str.toString().toLowerCase().replace(/[\s-]/g, '');

      const label =
        typeof child.props.label === 'string'
          ? child.props.label
          : child.props.label?.props?.children || '';
      const desc =
        typeof child.props.description === 'string' ? child.props.description : '';

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
    <div className={`settings-section flex flex-col min-h-0 mb-8 ${searchTerm ? 'animate-fade-in' : ''}`}>
      <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4 px-1 flex items-center gap-2 flex-shrink-0">
        {Icon && <Icon className="size-4" />}
        {title}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredChildren}
      </div>
    </div>
  );
}

export function ModifierInput({ value, onChange, validateModifier }) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState(false);

  const handleKeyDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') {
      setRecording(false);
      return;
    }
    let mod = null;
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

  const displayVal = value ? (KEY_SYMBOLS[value] ?? value) : null;

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

export function ShortcutInput({ value, onChange, onValidate, conflict }) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState(false);

  const handleKeyDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') {
      setRecording(false);
      return;
    }
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

    let keyName = e.code === 'Space' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
    const parts = [];
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
                {KEY_SYMBOLS[part] ?? part}
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
