import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { storage, STORAGE_KEYS } from '@/features/projects/services/storage.service';
import { useSettings } from '@/features/settings/useSettings';
import { consumeNewProject } from '@/features/editor/tour/tour-launch';
import { decideAutoTour } from '@/features/editor/tour/tour-decision';

export function useGuidedTour() {
  const { settings, updateSetting } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [offerOptOut, setOfferOptOut] = useState(false);

  // Latest prefs without making the callbacks change identity on every settings write.
  const prefsRef = useRef({ shown: 0, enabled: true });
  useLayoutEffect(() => {
    prefsRef.current = {
      shown: settings.interface?.editorTourShown ?? 0,
      enabled: settings.interface?.editorTourEnabled ?? true,
    };
  });

  // Set by an automatic showing; the count goes up only once a card actually renders (onShown).
  const countOnShownRef = useRef(false);

  // Manual replay: no opt-out offer, no count change.
  const start = useCallback(() => {
    countOnShownRef.current = false;
    setOfferOptOut(false);
    setIsOpen(true);
  }, []);

  const close = useCallback((optOut: boolean) => {
    countOnShownRef.current = false;
    setIsOpen(false);
    if (optOut) updateSetting('interface.editorTourEnabled', false);
  }, [updateSetting]);

  // Call once the editor has real content to point at (isReady && lines.length > 0).
  const maybeStartForNewProject = useCallback(() => {
    if (!consumeNewProject()) return;
    const { shown, enabled } = prefsRef.current;
    // The legacy key is read only; the new count supersedes it.
    const legacySeen = !!storage.get(STORAGE_KEYS.TUTORIAL_SEEN);
    const decision = decideAutoTour(true, { shown, enabled, legacySeen });
    if (!decision.show) return;
    countOnShownRef.current = true;
    setOfferOptOut(decision.offerOptOut);
    setIsOpen(true);
  }, []);

  // Capped at 1000: the server rejects more, and a rejected settings diff blocks all later sync.
  // Wired to GuidedTour's onShown: a tour that never found its targets must not use up a showing.
  const onShown = useCallback(() => {
    if (!countOnShownRef.current) return;
    countOnShownRef.current = false;
    updateSetting('interface.editorTourShown', Math.min(prefsRef.current.shown + 1, 1000));
  }, [updateSetting]);

  return { isOpen, offerOptOut, start, close, onShown, maybeStartForNewProject };
}
