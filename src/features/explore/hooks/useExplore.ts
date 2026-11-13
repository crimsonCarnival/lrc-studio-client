import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  getTrendingProjects,
  getPopularPlaylists,
  getSuggestedUsers,
  trackExploreEvents,
  type ExploreEvent,
} from '../explore.service.js';

// Matches the server's per-call cap (MAX_EVENTS_PER_CALL).
const TRACK_BATCH = 50;

/**
 * Reports each project's first appearance in this feed (with its position) and
 * returns a click reporter. "Impression" means rendered, not scrolled into view,
 * so treat the resulting rates as relative between projects, not absolute.
 * Nothing identifies the viewer; see the server's explore-event model.
 */
export function useExploreTracking(projects: { id: string; publicId?: string }[]) {
  const seen = useRef(new Set<string>());
  useEffect(() => {
    const fresh: ExploreEvent[] = [];
    projects.forEach((p, position) => {
      const publicId = p.publicId ?? p.id;
      if (seen.current.has(publicId)) return;
      seen.current.add(publicId);
      fresh.push({ publicId, type: 'IMPRESSION', position });
    });
    for (let i = 0; i < fresh.length; i += TRACK_BATCH) void trackExploreEvents(fresh.slice(i, i + TRACK_BATCH));
  }, [projects]);

  return useCallback((publicId: string) => {
    void trackExploreEvents([{ publicId, type: 'CLICK' }]);
  }, []);
}

// Each list has a preview query (first N, used by home/explore sections) and a
// paged one (the dedicated listing page). They are separate cache entries: the
// preview must not be replaced by however many pages the listing has loaded.
export const exploreKeys = {
  trendingPreview: (limit: number) => ['explore', 'trending', 'preview', limit] as const,
  trendingPaged: (limit: number) => ['explore', 'trending', 'paged', limit] as const,
  playlistsPreview: (limit: number) => ['explore', 'playlists', 'preview', limit] as const,
  playlistsPaged: (limit: number) => ['explore', 'playlists', 'paged', limit] as const,
  suggestedUsers: (limit: number) => ['explore', 'suggestedUsers', limit] as const,
};

// Trending scores are recomputed hourly on the server, so a minute-old ranking
// is as good as a fresh one and not worth a request on every visit.
const RANKED_STALE_MS = 60_000;

// Stable fallbacks so consumers' memo/effect deps don't change every render while loading.
const NO_PROJECTS: Awaited<ReturnType<typeof getTrendingProjects>>['projects'] = [];
const NO_PLAYLISTS: Awaited<ReturnType<typeof getPopularPlaylists>>['playlists'] = [];
const NO_USERS: Awaited<ReturnType<typeof getSuggestedUsers>> = [];

export function useTrendingProjects(limit = 6) {
  const query = useQuery({
    queryKey: exploreKeys.trendingPreview(limit),
    staleTime: RANKED_STALE_MS,
    queryFn: () => getTrendingProjects(0, limit),
  });
  return { projects: query.data?.projects ?? NO_PROJECTS, loading: query.isPending, error: query.error };
}

export function usePopularPlaylists(limit = 6) {
  const query = useQuery({
    queryKey: exploreKeys.playlistsPreview(limit),
    staleTime: RANKED_STALE_MS,
    queryFn: () => getPopularPlaylists(0, limit),
  });
  return { playlists: query.data?.playlists ?? NO_PLAYLISTS, loading: query.isPending, error: query.error };
}

export function useSuggestedUsers(limit = 8) {
  const query = useQuery({
    queryKey: exploreKeys.suggestedUsers(limit),
    queryFn: () => getSuggestedUsers(limit),
  });
  return { users: query.data ?? NO_USERS, loading: query.isPending, error: query.error };
}

export function usePaginatedProjects(limit = 12) {
  const query = useInfiniteQuery({
    queryKey: exploreKeys.trendingPaged(limit),
    staleTime: RANKED_STALE_MS,
    queryFn: ({ pageParam }) => getTrendingProjects(pageParam, limit),
    initialPageParam: 0,
    // The server pages by offset, so the cursor is the count loaded so far.
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore ? pages.reduce((n, page) => n + page.projects.length, 0) : undefined,
  });
  const projects = useMemo(() => query.data?.pages.flatMap((page) => page.projects) ?? NO_PROJECTS, [query.data]);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  // Stable identity: consumers hand this to an IntersectionObserver effect.
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return { projects, loading: query.isPending, loadingMore: isFetchingNextPage, error: query.error, hasMore: hasNextPage, loadMore };
}

export function usePaginatedPlaylists(limit = 12) {
  const query = useInfiniteQuery({
    queryKey: exploreKeys.playlistsPaged(limit),
    staleTime: RANKED_STALE_MS,
    queryFn: ({ pageParam }) => getPopularPlaylists(pageParam, limit),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore ? pages.reduce((n, page) => n + page.playlists.length, 0) : undefined,
  });
  const playlists = useMemo(() => query.data?.pages.flatMap((page) => page.playlists) ?? NO_PLAYLISTS, [query.data]);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  // Stable identity: consumers hand this to an IntersectionObserver effect.
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return { playlists, loading: query.isPending, loadingMore: isFetchingNextPage, error: query.error, hasMore: hasNextPage, loadMore };
}
