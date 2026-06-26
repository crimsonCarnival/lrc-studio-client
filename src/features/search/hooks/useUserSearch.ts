import { useState, useCallback, useRef } from 'react';
import { gqlRequest } from '@/app/graphql.client';
import type { FollowUser } from '@/types';
import { getCachedResults, cacheResults, getSuggestions } from '../search.cache';

const SEARCH_USERS_QUERY = /* GraphQL */ `
  query SearchUsers($query: String!, $limit: Int) {
    searchUsers(query: $query, limit: $limit) {
      id
      accountName
      displayName
      avatarUrl
    }
  }
`;

export function useUserSearch() {
  const [query, setQuery]                   = useState('');
  const [results, setResults]               = useState<FollowUser[]>([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<unknown>(null);
  const [localSuggestions, setLocalSuggestions] = useState<string[]>([]);
  const debounceRef                         = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setLocalSuggestions([]); return; }
    setError(null);

    const cached = getCachedResults(q);
    if (cached) {
      setResults(cached);
      setLoading(false);
      setLocalSuggestions(getSuggestions(q));
      return;
    }

    setLocalSuggestions(getSuggestions(q));
    setLoading(true);
    try {
      const data = await gqlRequest<{ searchUsers: FollowUser[] }>(SEARCH_USERS_QUERY, { query: q, limit: 20 });
      cacheResults(q, data.searchUsers);
      setResults(data.searchUsers);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  }, [search]);

  return { query, results, loading, error, localSuggestions, handleQueryChange, setQuery };
}
