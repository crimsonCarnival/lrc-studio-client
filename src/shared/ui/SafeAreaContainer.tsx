import type { CSSProperties, ReactNode } from 'react';
import useSafeArea from '../hooks/useSafeArea.js';

type PaddingMode = 'all' | 'horizontal' | 'vertical' | 'top' | 'bottom';

interface SafeAreaContainerProps {
  children?: ReactNode;
  /** Padding mode: 'all', 'horizontal', 'vertical', 'top', 'bottom' (default: 'all') */
  padding?: PaddingMode;
  className?: string;
}

/**
 * SafeAreaContainer component handles safe areas (notches, home indicators)
 * on mobile devices. It applies appropriate padding based on the safe area insets.
 */
export const SafeAreaContainer = ({
  children,
  padding = 'all',
  className = '',
}: SafeAreaContainerProps) => {
  const safeArea = useSafeArea();

  const getPaddingClasses = () => {
    switch (padding) {
      case 'horizontal':
        return 'max-lg:px-safe';
      case 'vertical':
        return 'max-lg:py-safe';
      case 'bottom':
        return 'max-lg:pb-safe';
      case 'top':
        return 'max-lg:pt-safe';
      case 'all':
      default:
        return 'max-lg:px-safe max-lg:py-safe';
    }
  };

  // Inline styles for safe area padding fallback (when Tailwind isn't available)
  const getInlineStyles = (): CSSProperties => {
    const styles: CSSProperties = {};

    switch (padding) {
      case 'horizontal':
        styles.paddingLeft = `${safeArea.left}px`;
        styles.paddingRight = `${safeArea.right}px`;
        break;
      case 'vertical':
        styles.paddingTop = `${safeArea.top}px`;
        styles.paddingBottom = `${safeArea.bottom}px`;
        break;
      case 'top':
        styles.paddingTop = `${safeArea.top}px`;
        break;
      case 'bottom':
        styles.paddingBottom = `${safeArea.bottom}px`;
        break;
      case 'all':
      default:
        styles.paddingLeft = `${safeArea.left}px`;
        styles.paddingRight = `${safeArea.right}px`;
        styles.paddingTop = `${safeArea.top}px`;
        styles.paddingBottom = `${safeArea.bottom}px`;
        break;
    }

    return styles;
  };

  return (
    <div
      className={`${getPaddingClasses()} ${className}`}
      style={getInlineStyles()}
      data-testid="safe-area-container"
    >
      {children}
    </div>
  );
};
