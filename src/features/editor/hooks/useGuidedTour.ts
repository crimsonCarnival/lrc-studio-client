import { useCallback, useState } from 'react';
import { storage, STORAGE_KEYS } from '@/features/projects/services/storage.service';

export function useGuidedTour() {
  const [isOpen, setIsOpen] = useState(false);

  const start = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Call once the editor has real content to point at (isReady && lines.length > 0).
  const startIfFirstVisit = useCallback(() => {
    if (storage.get(STORAGE_KEYS.TUTORIAL_SEEN)) return;
    storage.set(STORAGE_KEYS.TUTORIAL_SEEN, '1');
    setIsOpen(true);
  }, []);

  return { isOpen, start, close, startIfFirstVisit };
}
