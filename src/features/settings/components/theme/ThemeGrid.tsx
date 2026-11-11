import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { cn } from '@/shared/utils/utils';
import { THEME_PALETTES, shapeOf } from '@/shared/theme/themes';
import { CUSTOM_THEME_ID, SHAPE_RADIUS, type CustomTheme } from '@/shared/theme/custom-theme';

type Props = {
  value: string;
  onChange: (id: string) => void;
  /** The user's saved theme; its tile only shows once there is one. */
  custom: CustomTheme | null;
  /** Show only this many tiles (the theme in use is always among them). Omit for all. */
  limit?: number;
};

// The two Rosé Pine themes come from index.css, so their swatches are fixed here.
const BUILT_INS = [
  { id: 'dark', labelKey: 'settings.options.themes.dark', bg: '#232136', main: '#c4a7e7', text: '#f0eeff' },
  { id: 'light', labelKey: 'settings.options.themes.light', bg: '#faf4ed', main: '#6f5a8f', text: '#1a1826' },
] as const;

function Tile({ id, name, bg, main, text, radius, selected, onChange }: {
  id: string; name: string; bg: string; main: string; text: string; radius: number; selected: boolean; onChange: (id: string) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onChange(id)}
      // Each tile shows its own theme's corner sharpness and hover colour, not the active theme's.
      style={{ '--tile-main': main, borderRadius: radius + 2 } as CSSProperties}
      className={cn(
        'flex flex-col gap-2 border p-2.5 text-left transition-colors',
        selected ? 'border-[var(--tile-main)] ring-1 ring-[var(--tile-main)]' : 'border-zinc-800 hover:border-[var(--tile-main)]',
      )}
    >
      {/* Swatch values are the theme's own colours, not UI colours: they have to be literal. */}
      <span className="flex h-9 items-center gap-1.5 px-2" style={{ background: bg, borderRadius: radius }}>
        <span className="size-3.5" style={{ background: main, borderRadius: Math.min(radius, 7) }} />
        <span className="h-1.5 flex-1" style={{ background: text, opacity: 0.55, borderRadius: Math.min(radius, 3) }} />
      </span>
      <span className="flex items-center justify-between gap-1 text-xs font-medium capitalize text-foreground">
        <span className="truncate">{name}</span>
        {selected && <span className="shrink-0" style={{ color: main }}><Icon name="check" size={12} /></span>}
      </span>
    </button>
  );
}

/**
 * Every theme as a swatch tile: the user's own, the two built-ins, then the palette themes. With
 * `limit` only the first tiles show, but the theme in use always does (it takes the last slot).
 */
export default function ThemeGrid({ value, onChange, custom, limit }: Props) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;

  const tiles = [
    ...(custom ? [{ id: CUSTOM_THEME_ID, name: t('settings.themeEditor.customName'), bg: custom.bg, main: custom.main, text: custom.text, radius: custom.radius }] : []),
    ...BUILT_INS.map((b) => ({ id: b.id as string, name: tk(b.labelKey), bg: b.bg as string, main: b.main as string, text: b.text as string, radius: SHAPE_RADIUS.soft })),
    ...THEME_PALETTES.map((p) => ({ id: p.id, name: p.name, bg: p.bg, main: p.main, text: p.text, radius: SHAPE_RADIUS[shapeOf(p.id)] })),
  ];
  let shown = tiles;
  if (limit != null && tiles.length > limit) {
    shown = tiles.slice(0, limit);
    const active = tiles.find((x) => x.id === value);
    if (active && !shown.includes(active)) shown = [...shown.slice(0, limit - 1), active];
  }

  return (
    <div role="group" aria-label={t('settings.interface.theme')} className="grid grid-cols-2 gap-2 py-2 sm:grid-cols-3 lg:grid-cols-4">
      {shown.map((x) => (
        <Tile key={x.id} {...x} selected={value === x.id} onChange={onChange} />
      ))}
    </div>
  );
}
