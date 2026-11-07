import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, ReactNode, SyntheticEvent } from 'react';
import { m, LazyMotion, domAnimation, AnimatePresence, useIsPresent } from 'framer-motion';
import { Icon } from '@/shared/ui/Icon';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';

interface ActionDrawerProps {
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  showClose?: boolean;
  /** Ignore backdrop taps for this long after opening (a long-press release can land on it). */
  backdropGuardMs?: number;
}

/**
 * A mobile-first bottom sheet for actions and menus.
 */
export default function ActionDrawer({
  isOpen,
  onClose,
  title,
  children,
  showClose = true,
  backdropGuardMs = 0
}: ActionDrawerProps) {
  const openedAtRef = useRef(0);
  // Prevent scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      openedAtRef.current = Date.now();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return createPortal(
    <LazyMotion features={domAnimation}><AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <DrawerBackdrop
            key="backdrop"
            onClick={() => {
              if (backdropGuardMs > 0 && Date.now() - openedAtRef.current < backdropGuardMs) return;
              onClose();
            }}
          />
          <DrawerPanel key="panel" onClose={onClose} title={title} showClose={showClose}>
            {children}
          </DrawerPanel>
        </>
      )}
    </AnimatePresence></LazyMotion>,
    document.body
  );
}

/** While a drawer animates out it keeps catching taps (so none fall through to the page below) but acts on none. */
const swallow = (e: SyntheticEvent) => {
  e.stopPropagation();
  e.preventDefault();
};

function DrawerBackdrop({ onClick }: { onClick: () => void }) {
  const isPresent = useIsPresent();
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={isPresent ? undefined : swallow}
      onClick={isPresent ? onClick : swallow}
      className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[200]"
    />
  );
}

const TEXT_ENTRY = 'input:not([type]),input[type="text"],input[type="search"],input[type="url"],input[type="email"],input[type="number"],input[type="tel"],input[type="password"],textarea,[contenteditable]:not([contenteditable="false"])';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * The sheet itself. A modal dialog for assistive tech: named by its title, focus moves in
 * on open and returns to the opener on close, Tab stays inside, Escape closes. The body
 * scrolls when the content is taller than the screen.
 */
function DrawerPanel({ onClose, title, showClose, children }: { onClose: () => void; title?: string; showClose: boolean; children?: ReactNode }) {
  const { t } = useTranslation();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const isPresent = useIsPresent();

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    // The first control, not the close button, so a screen reader starts on the content.
    const candidate = panel?.querySelector<HTMLElement>('[data-drawer-body]')?.querySelector<HTMLElement>(FOCUSABLE) ?? null;
    // A text field would pop the on-screen keyboard the moment the sheet opens: focus the panel instead.
    const first = candidate && !candidate.matches(TEXT_ENTRY) ? candidate : panel;
    first?.focus({ preventScroll: true });
    return () => {
      // Skipped when the choice opened another dialog, which has taken focus by now.
      const holder = document.activeElement;
      const orphaned = !holder || holder === document.body || !!panel?.contains(holder);
      if (orphaned && opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <m.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : t('common.close')}
      tabIndex={-1}
      onPointerDownCapture={isPresent ? undefined : swallow}
      onClickCapture={isPresent ? undefined : swallow}
      onKeyDown={handleKeyDown}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-[201] flex max-h-[88dvh] flex-col bg-zinc-950 border-t border-zinc-800 rounded-t-[2rem] shadow-2xl outline-none pb-safe"
    >
      {/* Drag Handle Indicator */}
      <div aria-hidden className="w-12 h-1.5 bg-zinc-800 rounded-pill mx-auto mt-3 mb-1 shrink-0" />

      <div className="flex shrink-0 items-center justify-between px-6 pt-2 pb-3">
        {title ? <h3 id={titleId} className="text-lg font-semibold text-zinc-100">{title}</h3> : <span />}
        {showClose && (
          <Tip content={t('common.close')}>
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={onClose}
              aria-label={t('common.close')}
              className="-mr-2 rounded-pill"
            >
              <Icon name="close" size={20} />
            </Button>
          </Tip>
        )}
      </div>

      <div data-drawer-body className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-6 pb-8">
        {children}
      </div>
    </m.div>
  );
}

interface DrawerItemProps {
  iconName?: string;
  label: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'danger' | 'primary';
  /** Stays focusable and readable (aria-disabled) but does nothing; `description` says why. */
  disabled?: boolean;
  /** A second line under the label. */
  description?: ReactNode;
  /** For a choice among alternatives: marks the current one. */
  pressed?: boolean;
}

export function DrawerItem({ iconName, label, onClick, variant = 'default', disabled = false, description, pressed }: DrawerItemProps) {
  const baseClasses = "w-full min-h-11 flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-[0.98]";
  const variants = {
    default: "text-zinc-300 hover:bg-zinc-900 active:bg-zinc-900",
    danger: "text-red-400 hover:bg-red-500/10 active:bg-red-500/15",
    primary: "text-primary hover:bg-primary/10 active:bg-primary/15"
  };

  return (
    <button
      type="button"
      aria-disabled={disabled || undefined}
      aria-pressed={pressed}
      onClick={() => { if (!disabled) onClick?.(); }}
      className={`${baseClasses} ${variants[variant]} ${disabled ? 'opacity-50' : ''} ${pressed ? 'bg-primary/10 text-primary' : ''}`}
    >
      {iconName && <Icon name={iconName} size={20} />}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-sm font-normal text-zinc-400">{description}</span>}
      </span>
    </button>
  );
}
