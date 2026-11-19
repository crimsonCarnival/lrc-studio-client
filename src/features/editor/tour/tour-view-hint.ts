import { useCallback, useState } from 'react';
import { storage, STORAGE_KEYS } from '@/features/projects/services/storage.service';

/** Views without an automatic tour: their tour only opens when asked, so the button pulses until it is used once. */
export type HintView = 'words' | 'review';

const HINT_VIEWS: readonly HintView[] = ['words', 'review'];

/** Views whose hint was already used on this browser. Unreadable storage counts as none used. */
export function readSeenViewHints(): HintView[] {
  const value = storage.getJSON<unknown>(STORAGE_KEYS.TOUR_VIEW_HINTS);
  if (!Array.isArray(value)) return [];
  return HINT_VIEWS.filter((view) => value.includes(view));
}

export function recordViewHintSeen(view: HintView): void {
  const seen = readSeenViewHints();
  if (seen.includes(view)) return;
  storage.setJSON(STORAGE_KEYS.TOUR_VIEW_HINTS, [...seen, view]);
}

/**
 * Whether the view's tour button should pulse. It starts pulsing on the first render for a view
 * the user has not used the tour in yet, and stops once they open the tour from it.
 */
export function useTourViewHint(view: HintView): { pulse: boolean; markSeen: () => void } {
  const [pulse, setPulse] = useState(() => !readSeenViewHints().includes(view));
  const markSeen = useCallback(() => {
    recordViewHintSeen(view);
    setPulse(false);
  }, [view]);
  return { pulse, markSeen };
}
