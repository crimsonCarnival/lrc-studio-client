import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { cn } from '@/shared/utils/utils';
import { THEME_PALETTES } from '@/shared/theme/themes';

type Props = {
  value: string;
  onChange: (id: string) => void;
  /** Read by Section's search filter. */
  label?: string;
};

// The two Rosé Pine themes come from index.css, so their swatches are fixed here.
const BUILT_INS = [
  { id: 'dark', labelKey: 'settings.options.themes.dark', bg: '#232136', main: '#c4a7e7', text: '#f0eeff' },
  { id: 'light', labelKey: 'settings.options.themes.light', bg: '#faf4ed', main: '#6f5a8f', text: '#1a1826' },
] as const;

function Tile({ id, name, bg, main, text, selected, onChange }: {
  id: string; name: string; bg: string; main: string; text: string; selected: boolean; onChange: (id: string) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onChange(id)}
      className={cn(
        'flex flex-col gap-2 rounded-xl border p-2.5 text-left transition-colors',
        selected ? 'border-primary ring-1 ring-primary' : 'border-zinc-800 hover:border-zinc-700',
      )}
    >
      {/* Swatch values are the theme's own colours, not UI colours: they have to be literal. */}
      <span className="flex h-9 items-center gap-1.5 rounded-lg px-2" style={{ background: bg }}>
        <span className="size-3.5 rounded-full" style={{ background: main }} />
        <span className="h-1.5 flex-1 rounded-full" style={{ background: text, opacity: 0.55 }} />
      </span>
      <span className="flex items-center justify-between gap-1 text-xs font-medium capitalize text-foreground">
        <span className="truncate">{name}</span>
        {selected && <Icon name="check" size={12} className="shrink-0 text-primary" />}
      </span>
    </button>
  );
}

/** Every theme as a swatch tile: the two built-ins, then the palette themes. */
export default function ThemeGrid({ value, onChange }: Props) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;
  return (
    <div role="group" aria-label={t('settings.interface.theme')} className="grid grid-cols-2 gap-2 py-2 sm:grid-cols-3 lg:grid-cols-4">
      {BUILT_INS.map((b) => (
        <Tile key={b.id} id={b.id} name={tk(b.labelKey)} bg={b.bg} main={b.main} text={b.text} selected={value === b.id} onChange={onChange} />
      ))}
      {THEME_PALETTES.map((p) => (
        <Tile key={p.id} id={p.id} name={p.name} bg={p.bg} main={p.main} text={p.text} selected={value === p.id} onChange={onChange} />
      ))}
    </div>
  );
}
