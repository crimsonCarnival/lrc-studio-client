import { useEffect, useState } from 'react';

export type HeaderSlot = 'status' | 'center' | 'actions';

/**
 * Resolves one of the app header's workspace slots so a screen can portal its own
 * controls into the header bar (the editor's tabs, the preview's Publish button).
 * The header renders the slots; whichever workspace view is showing fills them.
 * Returns null until mounted, and when `enabled` is false.
 */
export function useHeaderSlot(slot: HeaderSlot, enabled = true): HTMLElement | null {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // The header is an earlier sibling in the tree, so its slot nodes exist by now.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEl(enabled ? document.getElementById(`workspace-header-${slot}`) : null);
  }, [slot, enabled]);
  return el;
}
