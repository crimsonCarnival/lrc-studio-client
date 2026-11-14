import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { listMySessions } from '../collab.service';
import type { CollabSessionSummary } from '../collab.types';

export const mySessionsKey = ['collab', 'mySessions'] as const;

const NO_SESSIONS: CollabSessionSummary[] = [];

/**
 * The signed-in user's live sessions. Shared by the Sessions page, the header's live
 * badge and the feed's side column, so they agree and one request serves all three.
 */
export function useMySessions() {
  const { user } = useAuthContext();
  const signedIn = !!user && !user.isGuest;
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: mySessionsKey,
    queryFn: listMySessions,
    enabled: signedIn,
    staleTime: 30_000,
    // Sessions end and gain members elsewhere; a slow poll keeps the badge honest.
    refetchInterval: signedIn ? 60_000 : false,
  });
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: mySessionsKey }), [queryClient]);
  return {
    sessions: query.data ?? NO_SESSIONS,
    loading: signedIn && query.isPending,
    error: query.error,
    refresh,
  };
}
