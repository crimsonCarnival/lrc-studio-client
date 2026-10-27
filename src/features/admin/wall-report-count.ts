import { useEffect, useSyncExternalStore } from 'react';
import { gqlRequest } from '@/app/graphql.client';
import { connectSocket } from '@/app/socket.client';

/**
 * Comments with open reports, for moderators: the badge on the Reports tab and on the
 * dashboard icon. One shared value, so the header, the dashboard and the icon don't each
 * keep their own copy; the server pushes `admin:wall_reports` whenever the queue changes.
 */
let count = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: number) {
  if (next === count) return;
  count = next;
  listeners.forEach(l => l());
}

function refresh(): Promise<void> {
  inflight ??= gqlRequest<{ wallOpenReportCount: number }>('query { wallOpenReportCount }')
    .then(d => set(d.wallOpenReportCount))
    .catch(() => {})
    .finally(() => { inflight = null; });
  return inflight;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The open report count, or 0 when `enabled` is false (the viewer can't moderate reports). */
export function useWallReportCount(enabled: boolean): number {
  useEffect(() => {
    if (!enabled) return;
    void refresh();
    // The socket is replaced on sign-out, so each consumer attaches to the current one.
    const socket = connectSocket();
    const onQueue = ({ open }: { open: number }) => set(open);
    // A reconnect may have missed updates.
    const onConnect = () => { void refresh(); };
    socket.on('admin:wall_reports', onQueue);
    socket.on('connect', onConnect);
    return () => {
      socket.off('admin:wall_reports', onQueue);
      socket.off('connect', onConnect);
    };
  }, [enabled]);
  const value = useSyncExternalStore(subscribe, () => count);
  return enabled ? value : 0;
}
