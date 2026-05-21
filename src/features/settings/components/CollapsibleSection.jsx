import { useState, useCallback } from 'react';
import useHapticFeedback from '../../../shared/hooks/useHapticFeedback';

/**
 * Collapsible accordion section for mobile settings
 *
 * Features:
 * - Toggle open/closed state on header click
 * - Haptic feedback on toggle
 * - Smooth expand/collapse animation
 * - Keyboard accessible (Enter/Space to toggle)
 * - Can be controlled or uncontrolled
 *
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {React.ReactNode} props.children - Section content
 * @param {boolean} [props.isOpen] - Controlled open state (optional)
 * @param {Function} [props.onToggle] - Callback when toggled (receives new state)
 * @param {string} [props.testId] - Test ID for the section
 * @param {boolean} [props.disabled] - Disable toggle interaction
 */
export const CollapsibleSection = ({
  title,
  children,
  isOpen: controlledIsOpen,
  onToggle,
  testId,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(controlledIsOpen ?? true);
  const { trigger: haptic } = useHapticFeedback();

  // Determine if controlled or uncontrolled
  const open = controlledIsOpen !== undefined ? controlledIsOpen : isOpen;

  const handleToggle = useCallback(() => {
    if (disabled) return;

    haptic('light');
    const newState = !open;

    // Update uncontrolled state if not controlled
    if (controlledIsOpen === undefined) {
      setIsOpen(newState);
    }

    onToggle?.(newState);
  }, [open, controlledIsOpen, onToggle, haptic, disabled]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  }, [handleToggle]);

  const COLLAPSE_TRANSITION = {
    type: 'spring',
    damping: 25,
    stiffness: 300,
  };

  return (
    <div
      className="border border-zinc-700 rounded-lg overflow-hidden"
      data-testid={testId}
    >
      {/* Header - clickable to toggle */}
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-expanded={open}
        className="w-full p-4 h-12 flex items-center justify-between text-left text-sm font-medium text-zinc-100 bg-zinc-800/50 hover-capable:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900"
      >
        <span className="font-semibold">{title}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-lg flex-shrink-0"
          aria-hidden="true"
        >
          ▼
        </motion.span>
      </button>

      {/* Content - conditionally visible with smooth spring animation */}
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        exit={{ height: 0, opacity: 0 }}
        transition={COLLAPSE_TRANSITION}
        className="overflow-hidden"
      >
        <div className="px-4 py-3 bg-zinc-900/50 border-t border-zinc-700/50">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default CollapsibleSection;
