import { createContext, useContext, useEffect } from 'react';

/**
 * Lets the phone editor tell AppLayout it is on screen. It draws its own header, player
 * strip and Mark row, so while it is mounted the app header and the docked player step
 * aside. Keyed on the editor actually being mounted rather than on the route, so a load
 * error, a skeleton or the preview on the same path keep the normal chrome.
 */
export const PhoneEditorChromeContext = createContext<((mounted: boolean) => void) | null>(null);

export function usePhoneEditorChrome(): void {
  const setMounted = useContext(PhoneEditorChromeContext);
  useEffect(() => {
    if (!setMounted) return;
    setMounted(true);
    return () => setMounted(false);
  }, [setMounted]);
}
