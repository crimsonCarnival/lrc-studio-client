import { useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FollowListType } from '@/types/graphql';
import type { PublicUser } from '@/types';
import { getFollowList, getPublicProfile, followUser, unfollowUser } from './profile.service';

export const profileKeys = {
  // asVisitor is part of the key: the owner's "view as others" preview is a
  // different server projection of the same profile.
  profile: (accountName: string, asVisitor: boolean) => ['profile', accountName, asVisitor] as const,
  followList: (accountName: string, type: FollowListType) => ['followList', accountName, type] as const,
};

/**
 * A public profile. `setProfile` edits the cached copy in place, for changes
 * the page already knows the outcome of (follow, block, a deleted project).
 */
export function useProfile(accountName: string | undefined, asVisitor: boolean) {
  const queryClient = useQueryClient();
  const queryKey = profileKeys.profile(accountName ?? '', asVisitor);
  const query = useQuery({
    queryKey,
    queryFn: () => getPublicProfile(accountName!, asVisitor),
    enabled: !!accountName,
  });

  const setProfile = useCallback(
    (update: (prev: PublicUser | null) => PublicUser | null) => {
      queryClient.setQueryData<PublicUser | null>(queryKey, (prev) => update(prev ?? null));
    },
    // queryKey is rebuilt every render; its parts are the real dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, accountName, asVisitor],
  );

  return {
    profile: query.data ?? null,
    loading: query.isPending,
    // The server answers null for a missing, deleted, banned or blocking user.
    notFound: query.isError || query.data === null,
    setProfile,
  };
}

/** One page per "load more"; the server pages by offset, so the cursor is the count loaded so far. */
export function useFollowList(accountName: string, type: FollowListType, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: profileKeys.followList(accountName, type),
    queryFn: ({ pageParam }) => getFollowList(accountName, type, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, page) => n + page.users.length, 0);
      // An empty page means the server has nothing more, whatever `total` claims
      // (blocked users are filtered out of pages but still counted).
      return lastPage.users.length > 0 && loaded < lastPage.total ? loaded : undefined;
    },
    enabled,
  });
}

/**
 * Follow or unfollow someone. The service call itself updates every cached
 * follow list and profile (see cache-sync), so there is nothing to patch here.
 */
export function useFollowToggle() {
  return useMutation({
    mutationFn: ({ accountName, follow }: { accountName: string; follow: boolean }) =>
      follow ? followUser(accountName) : unfollowUser(accountName),
  });
}
