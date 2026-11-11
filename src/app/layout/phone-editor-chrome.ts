import { createContext, useContext, useEffect, useLayoutEffect } from 'react';

type PhoneEditorChrome = {
  /** True while the phone editor is on screen. */
  mounted: boolean;
  setMounted: (mounted: boolean) => void;
  /** Starts the editor tour (owned by AppLayout, which renders it above the routes). */
  startTour: () => void;
};

/**
 * Lets the phone editor tell AppLayout it is on screen. It draws its own header, player
 * strip and Mark row, so while it is mounted the app header and the docked player step
 * aside. Keyed on the editor actually being mounted rather than on the route, so a load
 * error, a skeleton or the preview on the same path keep the normal chrome.
 */
export const PhoneEditorChromeContext = createContext<PhoneEditorChrome | null>(null);

// Layout effect so the chrome swaps in the same frame the phone editor appears or leaves:
// a passive effect let the app header, its padding and the docked player paint for one frame
// on entry and on rotation. Falls back to useEffect where there is no DOM (SSR).
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Called by the phone editor for as long as it is mounted. */
export function usePhoneEditorChrome(): void {
  const setMounted = useContext(PhoneEditorChromeContext)?.setMounted;
  useIsomorphicLayoutEffect(() => {
    if (!setMounted) return;
    setMounted(true);
    return () => setMounted(false);
  }, [setMounted]);
}

/** Whether the phone editor is on screen (false outside AppLayout). */
export function usePhoneEditorMounted(): boolean {
  return useContext(PhoneEditorChromeContext)?.mounted ?? false;
}

/** Starts the editor tour from inside the editor; undefined outside AppLayout. */
export function useStartTour(): (() => void) | undefined {
  return useContext(PhoneEditorChromeContext)?.startTour;
}
