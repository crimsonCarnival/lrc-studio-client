import { useEffect, useSyncExternalStore } from 'react';
import { connectSocket } from '@/app/socket.client';
import { adminService } from './services/admin.service';
import type { PendingAppeal } from './admin.types';

/**
 * Pending ban appeals, for moderators: the Appeals tab, its badge and the Inbox share one copy,
 * so a decision made in one place updates the others. The server pushes `admin:appeal_submitted`
 * when a user appeals; a decision made here calls `refreshAppeals`.
 */
type State = { appeals: PendingAppeal[]; total: number };
let state: State = { appeals: [], total: 0 };
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function refreshAppeals(): Promise<void> {
  inflight ??= adminService.getPendingAppeals()
    .then(next => {
      state = { appeals: next.appeals, total: next.total };
      listeners.forEach(l => l());
    })
    .catch(() => {})
    .finally(() => { inflight = null; });
  return inflight;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The pending appeals, or none when `enabled` is false (the viewer can't review appeals). */
export function useAppeals(enabled: boolean): State {
  useEffect(() => {
    if (!enabled) return;
    void refreshAppeals();
    // The socket is replaced on sign-out, so each consumer attaches to the current one.
    const socket = connectSocket();
    const onAppeal = () => { void refreshAppeals(); };
    socket.on('admin:appeal_submitted', onAppeal);
    // A reconnect may have missed one.
    socket.on('connect', onAppeal);
    return () => {
      socket.off('admin:appeal_submitted', onAppeal);
      socket.off('connect', onAppeal);
    };
  }, [enabled]);
  const current = useSyncExternalStore(subscribe, () => state);
  return enabled ? current : EMPTY;
}

const EMPTY: State = { appeals: [], total: 0 };
