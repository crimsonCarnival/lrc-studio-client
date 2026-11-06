import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { applyTheme } from '@/shared/theme/apply-theme';
import { RADIUS_MAX } from '@/shared/theme/themes';
import {
  COLOR_KEYS, EDITOR_BASES, customFromBase, serializeCustomTheme,
  type ColorKey, type CustomTheme,
} from '@/shared/theme/custom-theme';
import { SegmentedControl, SettingSelect, SettingOption } from '../shared';
import { ColorPicker } from '@ui/color-picker';
import ThemePreview, { type ThemeFocus } from './ThemePreview';

type Props = {
  /** What the editor opens with: the saved custom theme, or a copy of the theme in use. */
  initial: CustomTheme;
  /** The persisted theme, put back if the editor is left without saving. */
  restore: { theme: string; custom: CustomTheme | null };
  onSave: (serialized: string) => void;
  onCancel: () => void;
};

const HEX = /^#[0-9a-f]{6}$/i;

function ColorField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (hex: string) => void }) {
  const [text, setText] = useState(value);
  // The picker and a reset both change `value` from outside; resync only when it really changed,
  // so typing a partial hex in the box is not overwritten mid-edit.
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setText(value);
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <label className="text-sm text-zinc-300" htmlFor={`theme-color-${label}`}>{label}</label>
        <p className="text-xs text-zinc-500">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ColorPicker aria-label={label} value={value} onChange={(hex) => onChange(hex.toLowerCase())} />
        <input
          id={`theme-color-${label}`}
          value={text}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value;
            setText(v);
            if (HEX.test(v)) onChange(v.toLowerCase());
          }}
          className="h-8 w-24 rounded-md border border-zinc-700 bg-transparent px-2 font-mono text-xs text-foreground"
        />
      </div>
    </div>
  );
}

/** Pick a theme to start from, then change its colours, corner radius, glow and border strength. Previews live. */
export default function ThemeEditor({ initial, restore, onSave, onCancel }: Props) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;
  const [draft, setDraft] = useState<CustomTheme>(initial);
  // The control under the pointer or focus; the preview outlines what it changes.
  const [focus, setFocus] = useState<ThemeFocus | null>(null);
  const saved = useRef(false);
  const restoreRef = useRef(restore);

  // Live preview: the page itself is the preview. Leaving without saving puts the real theme back.
  useEffect(() => { applyTheme('custom', draft); }, [draft]);
  useEffect(() => () => {
    if (!saved.current) applyTheme(restoreRef.current.theme, restoreRef.current.custom);
  }, []);

  const set = <K extends keyof CustomTheme>(key: K, value: CustomTheme[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const track = (k: ThemeFocus) => ({
    onMouseEnter: () => setFocus(k),
    onMouseLeave: () => setFocus(null),
    onFocus: () => setFocus(k),
    onBlur: () => setFocus(null),
  });
  const applies = (k: ThemeFocus) => tk(`settings.themeEditor.applies.${k}`);

  return (
    <div className="grid gap-5 py-2 md:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]">
      <div className="order-first self-start md:sticky md:top-0 md:order-last">
        <ThemePreview focus={focus} />
      </div>
      <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-zinc-300">{t('settings.themeEditor.base')}</span>
        <SettingSelect label={t('settings.themeEditor.base')} value={draft.base} onValueChange={(id) => setDraft(customFromBase(id))}>
          {EDITOR_BASES.map((p) => <SettingOption key={p.id} value={p.id}>{p.name}</SettingOption>)}
        </SettingSelect>
      </div>

      <div className="flex flex-col gap-2.5">
        {COLOR_KEYS.map((k: ColorKey) => (
          <div key={k} {...track(k)}>
            <ColorField label={tk(`settings.themeEditor.colors.${k}`)} hint={applies(k)} value={draft[k]} onChange={(hex) => set(k, hex)} />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3" {...track('radius')}>
        <div className="min-w-0">
          <label htmlFor="theme-radius" className="text-sm text-zinc-300">{t('settings.themeEditor.radius')}</label>
          <p className="text-xs text-zinc-500">{applies('radius')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <input
            id="theme-radius"
            type="range"
            min={0}
            max={RADIUS_MAX}
            step={1}
            value={draft.radius}
            onChange={(e) => set('radius', Number(e.target.value))}
            className="w-36 accent-primary"
          />
          <span className="w-10 text-right font-mono text-xs text-zinc-400">{draft.radius}px</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3" {...track('glow')}>
        <div className="min-w-0">
          <span className="text-sm text-zinc-300">{t('settings.themeEditor.glow.label')}</span>
          <p className="text-xs text-zinc-500">{applies('glow')}</p>
        </div>
        <SegmentedControl
          label={t('settings.themeEditor.glow.label')}
          value={draft.glow}
          onChange={(v) => set('glow', v)}
          options={(['off', 'soft', 'strong'] as const).map((v) => ({ value: v, label: tk(`settings.themeEditor.glow.${v}`) }))}
        />
      </div>

      <div className="flex items-center justify-between gap-3" {...track('borders')}>
        <div className="min-w-0">
          <span className="text-sm text-zinc-300">{t('settings.themeEditor.borders.label')}</span>
          <p className="text-xs text-zinc-500">{applies('borders')}</p>
        </div>
        <SegmentedControl
          label={t('settings.themeEditor.borders.label')}
          value={draft.borders}
          onChange={(v) => set('borders', v)}
          options={(['subtle', 'normal', 'strong'] as const).map((v) => ({ value: v, label: tk(`settings.themeEditor.borders.${v}`) }))}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-800 pt-3">
        <Button type="button" variant="ghost" onClick={() => setDraft(customFromBase(draft.base))}>{t('settings.themeEditor.reset')}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>{t('settings.themeEditor.cancel')}</Button>
        <Button type="button" onClick={() => { saved.current = true; onSave(serializeCustomTheme(draft)); }}>{t('settings.themeEditor.save')}</Button>
      </div>
      </div>
    </div>
  );
}
