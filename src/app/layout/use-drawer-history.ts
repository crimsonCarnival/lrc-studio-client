import { useCallback, useEffect, useRef } from 'react';

const MARKER = 'lrcDrawer';

/**
 * Makes the system back button close a drawer instead of leaving the page. Opening pushes
 * one history entry (same URL, so the router sees no change); back pops it and closes.
 * Every other way of closing pops it too, so a drawer never leaves a stray entry behind.
 *
 * `requestClose(then)` is the one way to close: it pops the entry first and runs `then`
 * (typically a navigation) once the pop has landed, so the navigation pushes onto a clean stack.
 *
 * Known limit: reloading the page while the drawer is open leaves the marker entry behind,
 * so one extra Back press lands on the same page.
 */
export function useDrawerHistory(open: boolean, onClose: () => void) {
  const pushed = useRef(false);
  const pending = useRef<(() => void) | null>(null);
  // A pop is under way; further close requests must not pop again (that would leave the page).
  const closing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  const finish = useCallback(() => {
    clearTimeout(timer.current);
    pushed.current = false;
    closing.current = false;
    const then = pending.current;
    pending.current = null;
    onCloseRef.current();
    then?.();
  }, []);

  useEffect(() => {
    if (!open) return;
    window.history.pushState({ ...(window.history.state ?? {}), [MARKER]: true }, '');
    pushed.current = true;
    const onPop = () => { if (pushed.current) finish(); };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      clearTimeout(timer.current);
      // Unmounted or closed from outside while our entry is still on top: drop it quietly.
      if (pushed.current) {
        pushed.current = false;
        if (window.history.state?.[MARKER]) window.history.back();
      }
    };
  }, [open, finish]);

  return useCallback((then?: () => void) => {
    if (!pushed.current) {
      onCloseRef.current();
      then?.();
      return;
    }
    if (closing.current) {
      // Already popping: keep the latest follow-up, never pop twice.
      if (then) pending.current = then;
      return;
    }
    pending.current = then ?? null;
    // Our entry is gone when the route changed under the drawer (redirect, session expiry):
    // there is nothing to pop, so just close.
    if (!window.history.state?.[MARKER]) {
      finish();
      return;
    }
    closing.current = true;
    window.history.back();
    // A browser that never fires popstate must not leave the drawer stuck open.
    timer.current = setTimeout(() => { if (pushed.current) finish(); }, 400);
  }, [finish]);
}
