import type { MouseEvent } from 'react';

/**
 * onClick for a router <Link> whose in-app navigation goes through a guard (e.g. the
 * unsaved-changes prompt). Plain left clicks run `go`; modified and middle clicks fall
 * through so the browser opens the real href in a new tab or window.
 */
export function guardedLinkClick(e: MouseEvent, go: () => void) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  go();
}
