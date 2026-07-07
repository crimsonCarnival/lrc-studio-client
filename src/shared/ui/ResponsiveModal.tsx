import type { ReactNode } from 'react';
import useInputMethod from '../hooks/useInputMethod.js';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './dialog';
import ActionDrawer from './ActionDrawer';

interface ResponsiveModalProps {
  children?: ReactNode;
  open?: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  dialogProps?: Record<string, unknown>;
  drawerProps?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * ResponsiveModal - Auto-switches between Dialog (desktop) and ActionDrawer (mobile)
 *
 * On desktop (hover capability): Renders a centered modal dialog
 * On mobile (touch device): Renders a bottom sheet drawer
 */
const EMPTY_DIALOG_PROPS = {};
const EMPTY_DRAWER_PROPS = {};

export const ResponsiveModal = ({
  children,
  open,
  onOpenChange,
  title,
  description,
  dialogProps = EMPTY_DIALOG_PROPS,
  drawerProps = EMPTY_DRAWER_PROPS,
  ...props
}: ResponsiveModalProps) => {
  const inputMethod = useInputMethod();
  const isMobile = inputMethod === 'touch';

  if (isMobile) {
    return (
      <ActionDrawer
        isOpen={open}
        onClose={() => onOpenChange(false)}
        title={title}
        {...drawerProps}
      >
        <div className="p-4">
          {description && (
            <p className="text-sm text-zinc-400 mb-4">{description}</p>
          )}
          {children}
        </div>
      </ActionDrawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Radix a11y: DialogContent expects a DialogTitle child and an
          aria-describedby target; without them it logs console warnings. */}
      <DialogContent
        {...(description ? {} : { 'aria-describedby': undefined })}
        {...dialogProps}
        {...props}
      >
        {title && (
          <DialogTitle className="text-lg font-semibold mb-2">{title}</DialogTitle>
        )}
        {description && (
          <DialogDescription className="text-sm text-zinc-500 mb-4">{description}</DialogDescription>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default ResponsiveModal;
