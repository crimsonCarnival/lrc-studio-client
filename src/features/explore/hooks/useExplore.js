import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getTrendingProjects,
  getPopularPlaylists,
  getSuggestedUsers,
  getExploreStats,
} from '../explore.service.js';

export function useTrendingProjects(limit = 6) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getTrendingProjects(0, limit)
      .then(({ projects: items }) => { if (!cancelled) setProjects(items); })
      .catch(err => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [limit]);

  return { projects, loading, error };
}

export function usePopularPlaylists(limit = 6) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getPopularPlaylists(0, limit)
      .then(({ playlists: items }) => { if (!cancelled) setPlaylists(items); })
      .catch(err => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [limit]);

  return { playlists, loading, error };
}

export function useSuggestedUsers(limit = 8) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getSuggestedUsers(limit)
      .then(items => { if (!cancelled) setUsers(items); })
      .catch(err => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [limit]);

  return { users, loading, error };
}

export function useExploreStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getExploreStats()
      .then(data => { if (!cancelled) setStats(data); })
      .catch(err => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { stats, loading, error };
}

export function usePaginatedProjects(limit = 12) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);

  const fetchPage = useCallback(async (offset, append) => {
    try {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      const { projects: items, hasMore: more } = await getTrendingProjects(offset, limit);

      setProjects(prev => append ? [...prev, ...items] : items);
      setHasMore(more);
      offsetRef.current = offset + items.length;
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [limit]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPage(0, false); }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    fetchPage(offsetRef.current, true);
  }, [hasMore, loadingMore, fetchPage]);

  return { projects, loading, loadingMore, error, hasMore, loadMore };
}

export function usePaginatedPlaylists(limit = 12) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);

  const fetchPage = useCallback(async (offset, append) => {
    try {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      const { playlists: items, hasMore: more } = await getPopularPlaylists(offset, limit);

      setPlaylists(prev => append ? [...prev, ...items] : items);
      setHasMore(more);
      offsetRef.current = offset + items.length;
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [limit]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPage(0, false); }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    fetchPage(offsetRef.current, true);
  }, [hasMore, loadingMore, fetchPage]);

  return { playlists, loading, loadingMore, error, hasMore, loadMore };
}
