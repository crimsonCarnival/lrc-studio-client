import { useCallback, useState } from 'react';
import { followUser, unfollowUser } from '@/features/profile/profile.service';

type FollowState = 'pending' | 'following' | 'not-following';

/**
 * Follow buttons for a list of people. Optimistic per account: the button flips at once and
 * goes back if the request fails. `isFollowing` falls back to what the server said.
 */
export function useFollowToggle() {
  const [state, setState] = useState<Record<string, FollowState>>({});

  const toggle = useCallback(async (accountName: string, currentlyFollowing: boolean) => {
    setState((s) => ({ ...s, [accountName]: 'pending' }));
    try {
      if (currentlyFollowing) await unfollowUser(accountName);
      else await followUser(accountName);
      setState((s) => ({ ...s, [accountName]: currentlyFollowing ? 'not-following' : 'following' }));
    } catch {
      setState((s) => ({ ...s, [accountName]: currentlyFollowing ? 'following' : 'not-following' }));
    }
  }, []);

  const isFollowing = useCallback(
    (accountName: string, serverValue?: boolean | null) => {
      const s = state[accountName];
      if (s === 'following') return true;
      if (s === 'not-following') return false;
      return !!serverValue;
    },
    [state],
  );

  const isPending = useCallback((accountName: string) => state[accountName] === 'pending', [state]);

  return { toggle, isFollowing, isPending };
}
