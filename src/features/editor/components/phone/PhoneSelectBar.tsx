import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';

type PhoneSelectBarProps = {
  count: number;
  onDone: () => void;
  onSelectAll: () => void;
  onShiftEarlier: () => void;
  onShiftLater: () => void;
  onClearTimestamps: () => void;
  onDelete: () => void;
  onMore: () => void;
};

const ACTION = 'flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-center text-[11px] font-medium leading-tight break-words text-foreground/80 hover:bg-raised aria-disabled:opacity-40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus';

/**
 * Select mode's bar, in the Mark row's place: the same bulk handlers the desktop's
 * SelectionActionBar uses, at touch size. Reorder is the grip on each selected row.
 */
export default function PhoneSelectBar(p: PhoneSelectBarProps) {
  const { t } = useTranslation();
  const none = p.count === 0;
  const act = (fn: () => void) => () => { if (!none) fn(); };
  return (
    <div role="toolbar" aria-label={t('editor.selection.actions')} className="px-2 pb-safe pt-1">
      <div className="flex items-center gap-2 px-2">
        <p role="status" className="min-w-0 flex-1 truncate text-sm text-subtle">
          {none ? t('editor.phone.select.empty') : t('editor.phone.select.count', { count: p.count })}
        </p>
        <button type="button" onClick={p.onSelectAll} className="h-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-foreground/80 hover:bg-raised focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus">
          {t('editor.selection.selectAll')}
        </button>
        <button type="button" onClick={p.onDone} className="h-11 shrink-0 rounded-lg bg-primary px-4 text-sm font-semibold text-zinc-950 hover:bg-primary-dim focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus">
          {t('editor.phone.select.done')}
        </button>
      </div>
      <div className="flex">
        <button type="button" aria-disabled={none} onClick={act(p.onShiftEarlier)} className={ACTION}>
          <Icon name="chevron_left" size={20} />
          {t('editor.phone.select.earlier')}
        </button>
        <button type="button" aria-disabled={none} onClick={act(p.onShiftLater)} className={ACTION}>
          <Icon name="chevron_right" size={20} />
          {t('editor.phone.select.later')}
        </button>
        <button type="button" aria-disabled={none} onClick={act(p.onClearTimestamps)} className={ACTION}>
          <Icon name="ink_eraser" size={20} />
          {t('editor.selection.clearTimestamps')}
        </button>
        <button type="button" aria-disabled={none} onClick={act(p.onMore)} className={ACTION}>
          <Icon name="person" size={20} />
          {t('editor.phone.select.more')}
        </button>
        <button type="button" aria-disabled={none} onClick={act(p.onDelete)} className={`${ACTION} text-love-ink`}>
          <Icon name="delete" size={20} />
          {t('editor.selection.deleteSelected')}
        </button>
      </div>
    </div>
  );
}
