import { motion } from 'framer-motion';

/**
 * Unified loading spinner component
 * Provides consistent loading state across all pages (Library, Settings, Upload)
 *
 * @param {string} size - Size variant: 'sm', 'md', 'lg' (default: 'md')
 */
export function LoadingSpinner({ size = 'md' }) {
  const sizes = {
    sm: 'size-6 border border-primary/30',
    md: 'size-8 border-2 border-primary/30',
    lg: 'size-12 border-2 border-primary/30',
  };

  const sizeClass = sizes[size] || sizes['md'];

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      className={`${sizeClass} border-t-primary rounded-full`}
    />
  );
}

export default LoadingSpinner;
