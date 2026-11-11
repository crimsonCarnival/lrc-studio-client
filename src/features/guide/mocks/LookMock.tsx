import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';

const TILE = 'flex flex-col gap-2 rounded-lg border border-zinc-700 p-2.5';
const KINDS = ['off', 'bars', 'wave', 'aurora'] as const;

// The theme picker's built-in tiles, and the visualizer picker's title with a few of its presets.
export default function LookMock() {
  const { t } = useTranslation();
  const themes = [
    { label: t('settings.options.themes.dark'), tone: 'dark bg-zinc-900' },
    { label: t('settings.options.themes.light'), tone: 'bg-zinc-100' },
  ];
  return (
    <div aria-hidden="true" className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {themes.map((th) => (
          <div key={th.label} className={TILE}>
            <span className={`flex h-9 items-center gap-1.5 rounded-md px-2 ${th.tone}`}>
              <span className="size-3.5 rounded-xs bg-primary" />
              <span className="h-1.5 flex-1 rounded-xs bg-subtle" />
            </span>
            <span className="truncate text-xs font-medium text-foreground">{th.label}</span>
          </div>
        ))}
        <div className={`${TILE} items-center justify-center text-xs text-zinc-300`}>
          <Icon name="palette" size={18} />
          <span className="text-center">{t('settings.interface.moreThemes')}</span>
        </div>
      </div>
      <div className="border-t border-zinc-800 pt-3 flex flex-col gap-2">
        <span className="text-sm font-semibold text-zinc-100">{t('projectView.visualizer.title')}</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {KINDS.map((k) => (
            <div key={k} className={`${TILE} ${k === 'bars' ? 'border-primary bg-primary/10' : ''}`}>
              <span className="text-xs font-semibold text-zinc-100">{t(`projectView.visualizer.kinds.${k}.label`)}</span>
              <span className="text-[11px] text-zinc-400">{t(`projectView.visualizer.kinds.${k}.hint`)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
