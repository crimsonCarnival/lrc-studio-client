import { useCallback, useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { gqlRequest } from '@/app/graphql.client';
import { getSocket } from '@/app/socket.client';
import type { FeedResult, Activity } from '@/types';

const FEED_QUERY = /* GraphQL */ `
  query Feed($offset: Int, $limit: Int) {
    feed(offset: $offset, limit: $limit) {
      activities {
        id
        type
        publicId
        projectTitle
        coverImage
        targetPath
        createdAt
        actor {
          id
          accountName
          displayName
          avatarUrl
        }
      }
      hasMore
    }
  }
`;

const feedKey = (limit: number) => ['feed', limit] as const;
const NO_ACTIVITIES: Activity[] = [];

export function useFeed(limit = 20) {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: feedKey(limit),
    queryFn: async ({ pageParam }) => (await gqlRequest<{ feed: FeedResult }>(FEED_QUERY, { offset: pageParam, limit })).feed,
    initialPageParam: 0,
    // The server pages by offset, so the cursor is the count loaded so far —
    // which includes items pushed over the socket below, keeping pages aligned.
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore ? pages.reduce((n, page) => n + page.activities.length, 0) : undefined,
  });

  // Real-time: prepend new items pushed from the server
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onFeedNew = (activity: Activity) => {
      queryClient.setQueryData<InfiniteData<FeedResult>>(feedKey(limit), (data) => {
        if (!data) return data;
        const [first, ...rest] = data.pages;
        return { ...data, pages: [{ ...first, activities: [activity, ...first.activities] }, ...rest] };
      });
    };

    socket.on('feed:new', onFeedNew);
    return () => { socket.off('feed:new', onFeedNew); };
  }, [queryClient, limit]);

  const activities = useMemo(() => query.data?.pages.flatMap((page) => page.activities) ?? NO_ACTIVITIES, [query.data]);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  // Stable identity: consumers hand this to an IntersectionObserver effect.
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return { activities, hasMore: hasNextPage, loading: query.isPending, loadingMore: isFetchingNextPage, error: query.error, loadMore };
}
