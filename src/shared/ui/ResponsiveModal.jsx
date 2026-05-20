import React from 'react';
import useInputMethod from '../hooks/useInputMethod.js';
import { Dialog, DialogContent } from './dialog.tsx';
import ActionDrawer from './ActionDrawer.jsx';

/**
 * ResponsiveModal - Auto-switches between Dialog (desktop) and ActionDrawer (mobile)
 *
 * On desktop (hover capability): Renders a centered modal dialog
 * On mobile (touch device): Renders a bottom sheet drawer
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to display in the modal
 * @param {boolean} props.open - Whether the modal is open
 * @param {Function} props.onOpenChange - Callback when open state changes
 * @param {string} [props.title] - Optional title to display
 * @param {string} [props.description] - Optional description to display
 * @param {Object} [props.dialogProps] - Additional props to pass to Dialog component
 * @param {Object} [props.drawerProps] - Additional props to pass to ActionDrawer component
 *
 * @example
 * <ResponsiveModal open={isOpen} onOpenChange={setIsOpen} title="Edit Profile">
 *   <form>...</form>
 * </ResponsiveModal>
 */
export const ResponsiveModal = ({
  children,
  open,
  onOpenChange,
  title,
  description,
  dialogProps = {},
  drawerProps = {},
  ...props
}) => {
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
        <div className="px-4 py-4">
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
      <DialogContent {...dialogProps} {...props}>
        {title && (
          <h2 className="text-lg font-semibold mb-2">{title}</h2>
        )}
        {description && (
          <p className="text-sm text-zinc-500 mb-4">{description}</p>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default ResponsiveModal;
