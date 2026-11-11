import { useEffect } from 'react';

// Within this many pixels of the top edge the header comes back.
const REVEAL_EDGE_PX = 12;
// Short: a pointer that has left the header should not leave it hanging over the page.
const HIDE_DELAY_MS = 120;
// Needs a pointer that can reach the top edge, and the desktop header that overlays the page.
const POINTER_DESKTOP = '(min-width: 1024px) and (hover: hover)';
// While one of these is open the pointer is allowed to wander off the header.
const OPEN_OVERLAY = '[role="menu"], [role="listbox"], [role="dialog"]';

/**
 * Slides the app header out of view while `active` (the page is not the editor), and brings it back when the pointer
 * reaches the top of the page or focus moves into it. The flag lives on <html> because the
 * header and the page's own offsets (the `--header-offset` variable in index.css) both
 * follow it, so everything resizes together.
 */
export function useAutoHideHeader(active: boolean) {
  useEffect(() => {
    if (!active || !window.matchMedia(POINTER_DESKTOP).matches) return;
    const root = document.documentElement;
    let timer: number | undefined;

    const header = () => document.querySelector<HTMLElement>('[data-app-header]');
    const hide = () => root.setAttribute('data-header-hidden', '');
    const reveal = () => {
      window.clearTimeout(timer);
      timer = undefined;
      root.removeAttribute('data-header-hidden');
    };
    const held = () => {
      const el = header();
      return !!el && (el.contains(document.activeElement) || !!document.querySelector(OPEN_OVERLAY));
    };
    // Armed once, not restarted by every pointer move, so the delay counts from leaving the header.
    const scheduleHide = () => {
      if (timer !== undefined) return;
      timer = window.setTimeout(() => {
        timer = undefined;
        if (!held()) hide();
      }, HIDE_DELAY_MS);
    };

    const onMove = (e: PointerEvent) => {
      if (e.clientY <= REVEAL_EDGE_PX) {
        reveal();
        return;
      }
      const el = header();
      const below = el ? el.getBoundingClientRect().bottom : 0;
      if (!root.hasAttribute('data-header-hidden') && e.clientY > below + 8) scheduleHide();
    };
    const onFocusIn = (e: FocusEvent) => {
      if (header()?.contains(e.target as Node)) reveal();
    };
    const onFocusOut = () => scheduleHide();

    hide();
    window.addEventListener('pointermove', onMove);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      root.removeAttribute('data-header-hidden');
    };
  }, [active]);
}
