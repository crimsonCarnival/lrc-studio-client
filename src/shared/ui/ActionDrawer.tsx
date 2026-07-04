import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { m, LazyMotion, domAnimation, AnimatePresence } from 'framer-motion';
import { Icon } from '@/shared/ui/Icon';
import { createPortal } from 'react-dom';

interface ActionDrawerProps {
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  showClose?: boolean;
}

/**
 * A mobile-first bottom sheet for actions and menus.
 */
export default function ActionDrawer({
  isOpen,
  onClose,
  title,
  children,
  showClose = true
}: ActionDrawerProps) {
  // Prevent scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
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
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[200]"
          />

          {/* Drawer */}
          <m.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[201] bg-zinc-950 border-t border-zinc-800 rounded-t-[2rem] shadow-2xl safe-area-pb"
          >
            {/* Drag Handle Indicator */}
            <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mt-3 mb-1" />

            <div className="px-6 pb-8 pt-2">
              <div className="flex items-center justify-between mb-6">
                {title && <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>}
                {showClose && (
                  <button
                    onClick={onClose}
                    className="p-2 -mr-2 text-zinc-400 hover:text-zinc-200 bg-zinc-900 rounded-full transition-colors"
                  >
                    <Icon name="close" size={20} />
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {children}
              </div>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence></LazyMotion>,
    document.body
  );
}

interface DrawerItemProps {
  iconName?: string;
  label: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'danger' | 'primary';
}

export function DrawerItem({ iconName, label, onClick, variant = 'default' }: DrawerItemProps) {
  const baseClasses = "w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98]";
  const variants = {
    default: "text-zinc-300 hover:bg-zinc-900 active:bg-zinc-900",
    danger: "text-red-400 hover:bg-red-500/10 active:bg-red-500/15",
    primary: "text-primary hover:bg-primary/10 active:bg-primary/15"
  };

  return (
    <button onClick={onClick} className={`${baseClasses} ${variants[variant]}`}>
      {iconName && <Icon name={iconName} size={20} />}
      <span className="text-base font-medium">{label}</span>
    </button>
  );
}
