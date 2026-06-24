import { useSyncExternalStore } from 'react';
import { presenceStore } from '@/features/auth/presence.store';

export function usePresence() {
  useSyncExternalStore(presenceStore.subscribe, presenceStore.getVersion);
  return presenceStore;
}
