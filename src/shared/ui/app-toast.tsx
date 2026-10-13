import type { ReactNode } from 'react';
import { toast, resolveValue, type Toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/utils/utils';
import { Button } from '@ui/button';
import { LogoLoader } from '@ui/LogoLoader';

// Stroke icons drawn here rather than through Icon: toasts can fire before the icon font loads.
function Glyph({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const CHECK = 'M5 12.5l4.5 4.5L19 7';
const ALERT = 'M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0 M12 7.5v5.5 M12 16.5h.01';
const CLOSE = 'M6 6l12 12 M18 6L6 18';

function tile(item: Toast): { className: string; icon: ReactNode } | null {
  if (item.icon) return { className: 'bg-primary-soft text-primary-ink', icon: item.icon };
  switch (item.type) {
    case 'success': return { className: 'bg-primary-soft text-foam', icon: <Glyph d={CHECK} /> };
    case 'error': return { className: 'bg-love-soft text-love-ink', icon: <Glyph d={ALERT} /> };
    case 'loading': return { className: 'bg-primary-soft text-primary-ink', icon: <LogoLoader size={14} className="text-primary-ink" /> };
    default: return null;
  }
}

/**
 * The single toast shell (redesign sheet 08): icon tile, message, close button and a bar that
 * drains over the toast's lifetime. Rendered by the Toaster for every toast, so call sites keep
 * using `toast.success(...)` / `toast.error(...)` unchanged.
 */
export function AppToast({ item }: { item: Toast }) {
  const { t } = useTranslation();
  const icon = tile(item);
  const timed = item.type !== 'loading' && Number.isFinite(item.duration) && (item.duration ?? 0) > 0;

  return (
    <div
      {...item.ariaProps}
      className={cn(
        'group/toast pointer-events-auto relative flex w-max max-w-[min(380px,calc(100vw-2rem))] items-start gap-3 overflow-hidden rounded-[14px] bg-raised py-3.5 pr-3 pl-4 text-foreground shadow-toast inset-ring inset-ring-hl',
        item.visible
          ? 'animate-in fade-in-0 slide-in-from-bottom-3 duration-[220ms]'
          : 'animate-out fade-out-0 duration-[160ms] fill-mode-forwards',
      )}
    >
      {icon && (
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-[10px]', icon.className)}>{icon.icon}</span>
      )}
      <div className={cn('min-w-0 flex-1 text-[15px] font-semibold leading-snug', icon && 'pt-1.5')}>
        {resolveValue(item.message, item)}
      </div>
      <Button
        type="button"
        variant="ghost"
        size={null}
        aria-label={t('common.close')}
        onClick={() => toast.dismiss(item.id)}
        className="-mt-1 size-8 shrink-0 rounded-lg text-subtle hover:bg-overlay hover:text-foreground"
      >
        <Glyph d={CLOSE} />
      </Button>
      {timed && (
        <span
          aria-hidden="true"
          // Hovering pauses react-hot-toast's own timers, so the bar pauses with them.
          className="toast-timer absolute bottom-0 left-0 h-[3px] w-full origin-left bg-iris group-hover/toast:[animation-play-state:paused]"
          style={{ animation: `toast-timer ${item.duration}ms linear forwards` }}
        />
      )}
    </div>
  );
}

type ToastBodyProps = {
  title: ReactNode;
  /** Second line, truncated to one line: a file name, a count, where it went. */
  description?: ReactNode;
  /** One inline action. Pass `toastId` too so the toast closes once it is taken. */
  action?: { label: string; onClick: () => void };
  toastId?: string;
};

/**
 * Optional richer content for a toast: `toast.success(<ToastBody title=… description=… />)`.
 * A plain string is still the normal case; reach for this when the toast has a detail
 * worth showing or one obvious next step (retry, review).
 */
export function ToastBody({ title, description, action, toastId }: ToastBodyProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span>{title}</span>
      {description && <span className="truncate text-sm font-normal text-subtle">{description}</span>}
      {action && (
        <Button
          type="button"
          variant="link"
          size={null}
          onClick={() => {
            if (toastId) toast.dismiss(toastId);
            action.onClick();
          }}
          className="self-start rounded-sm text-[15px] text-primary-ink underline decoration-1 underline-offset-[3px]"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
