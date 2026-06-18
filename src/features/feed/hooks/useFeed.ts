import { useState, useEffect, useCallback, useRef } from 'react';
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

export function useFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [hasMore, setHasMore]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]           = useState<unknown>(null);
  const offsetRef = useRef(0);

  const fetchPage = useCallback(async (offset: number, append: boolean) => {
    try {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      const data = await gqlRequest<{ feed: FeedResult }>(FEED_QUERY, { offset, limit: 20 });
      const { activities: items, hasMore: more } = data.feed;

      setActivities(prev => append ? [...prev, ...items] : items);
      setHasMore(more);
      offsetRef.current = offset + items.length;
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial fetch
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPage(0, false); }, [fetchPage]);

  // Real-time: prepend new items pushed from the server
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onFeedNew = (activity: Activity) => {
      setActivities(prev => [activity, ...prev]);
      offsetRef.current += 1;
    };

    socket.on('feed:new', onFeedNew);
    return () => { socket.off('feed:new', onFeedNew); };
  }, []);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    fetchPage(offsetRef.current, true);
  }, [hasMore, loadingMore, fetchPage]);

  return { activities, hasMore, loading, loadingMore, error, loadMore };
}
