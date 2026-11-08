import { useEffect, useLayoutEffect, useRef } from 'react';
import { holdsUnsavedEdits } from '@/features/projects/project-path';

/**
 * Flushes pending edits when the user leaves the editor by any route (system Back, a link,
 * navigate()) and when the page is hidden (switching apps, closing the tab, bfcache).
 *
 * `flush` receives the router path the edits belong to. It is read through a ref, so the
 * effects below are keyed on the pathname alone and never re-run because the caller passed a
 * new inline function (that pattern re-fired a Setup effect every render and stole focus).
 *
 * On a phone the browser may kill a request started from a hidden page, which is why autosave
 * stays on; this is a best effort on top of it.
 */
export function useSaveOnLeave(pathname: string, flush: (path: string) => void): void {
  const flushRef = useRef(flush);
  const pathRef = useRef(pathname);
  const prevPathRef = useRef(pathname);
  // Layout effect: it must run before any passive effect of the same commit can reset
  // the state the flush reads (the refs are written during the previous render).
  useLayoutEffect(() => { flushRef.current = flush; });

  useLayoutEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;
    pathRef.current = pathname;
    // Editor -> editor (setup to local draft) keeps the state in memory: nothing is leaving.
    if (prev !== pathname && holdsUnsavedEdits(prev) && !holdsUnsavedEdits(pathname)) flushRef.current(prev);
  }, [pathname]);

  useEffect(() => {
    const onHide = () => { if (holdsUnsavedEdits(pathRef.current)) flushRef.current(pathRef.current); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') onHide(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);
}
