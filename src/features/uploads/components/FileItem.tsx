import { useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useHapticFeedback from '@/shared/hooks/useHapticFeedback';
import { Button } from '@ui/button';

interface FileItemProps {
  file: File;
  progress?: number;
  onDelete?: () => void;
}

/**
 * Displays a single file in the upload list: name/size, progress bar,
 * delete button with confirmation, and swipe-left-to-delete gesture.
 */
export const FileItem = ({ file, progress, onDelete }: FileItemProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { trigger: haptic } = useHapticFeedback();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const touchStartRef = useRef({ x: 0, time: 0 });

  // Touch handlers for swipe-left to delete
  const handleTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    const touch = e.changedTouches[0];
    const startX = touchStartRef.current.x;
    const endX = touch.clientX;
    const timeDiff = Date.now() - touchStartRef.current.time;

    // Swipe left: startX - endX > 60px threshold, quick movement
    if (startX - endX > 60 && timeDiff < 500) {
      haptic('medium');
      setDeleteConfirm(true);
    }
  };

  const handleDeleteClick = (e: ReactMouseEvent) => {
    e.stopPropagation?.();
    setDeleteConfirm(true);
  };

  const handleConfirmDelete = (e: ReactMouseEvent) => {
    e.stopPropagation?.();
    onDelete?.();
    setDeleteConfirm(false);
  };

  const handleCancelDelete = (e: ReactMouseEvent) => {
    e.stopPropagation?.();
    setDeleteConfirm(false);
  };

  const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);

  return (
    <motion.div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between gap-3 select-none"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{file.name}</p>
        <p className="text-xs text-zinc-400">{fileSizeMB} MB</p>

        {/* Upload progress bar with animation */}
        <AnimatePresence>
          {progress !== undefined && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 w-full bg-zinc-700 rounded-full h-1 overflow-hidden"
            >
              <motion.div
                className="bg-primary h-1 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                aria-label={`Upload progress: ${progress}%`}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete button or confirmation */}
      <AnimatePresence mode="wait">
        {deleteConfirm ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="flex gap-2 flex-shrink-0"
          >
            <Button
              type="button"
              onClick={handleConfirmDelete}
              className="px-2 h-8 text-xs bg-red-600 hover:bg-red-700 rounded text-white font-medium"
            >
              Delete
            </Button>
            <Button
              type="button"
              onClick={handleCancelDelete}
              className="px-2 h-8 text-xs bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300 font-medium"
            >
              Cancel
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="delete-btn"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <Button
              type="button"
              onClick={handleDeleteClick}
              className="p-2 text-zinc-400 hover:text-red-500 transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={`Delete ${file.name}`}
            >
              ✕
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FileItem;
