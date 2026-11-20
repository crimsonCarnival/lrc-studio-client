import { useSyncExternalStore } from 'react';
import { loadMiniPlayer, ownsPlayer, type ViewSnapshot } from './mini-player';

/**
 * The public project view's playback, handed over as the view is left. The view mounts its
 * own player, which goes with it; AppLayout mounts a second one from this snapshot so the
 * song carries on in the mini player. A plain store rather than context: the view publishes
 * from its unmount, when no React tree above it is listening for a state change.
 */
let state: ViewSnapshot | null | undefined;
const listeners = new Set<() => void>();

function read(): ViewSnapshot | null {
  if (state === undefined) {
    // First read: a reload brings back what the tab was carrying, paused (nothing may start
    // playing on its own after a load).
    const stored = typeof window !== 'undefined' ? loadMiniPlayer() : null;
    state = stored?.kind === 'view' && !ownsPlayer(window.location.pathname) ? { ...stored.snapshot, playing: false } : null;
  }
  return state;
}

function set(next: ViewSnapshot | null) {
  if (next === read()) return;
  state = next;
  for (const l of listeners) l();
}

export const publishHandoff = (snapshot: ViewSnapshot) => set(snapshot);
export const clearHandoff = () => set(null);

export function useHandoff(): ViewSnapshot | null {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    read,
    () => null,
  );
}

/** Tests only. */
export function resetHandoffForTests() { state = undefined; listeners.clear(); }
