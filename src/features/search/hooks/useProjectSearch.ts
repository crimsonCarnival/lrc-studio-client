import { useState, useCallback, useRef } from 'react';
import { gqlRequest } from '@/app/graphql.client';
import type { SearchResult, Project, SearchSort } from '@/types';

const SEARCH_QUERY = /* GraphQL */ `
  query SearchProjects($query: String!, $sortBy: SearchSort, $offset: Int, $limit: Int) {
    searchProjects(query: $query, sortBy: $sortBy, offset: $offset, limit: $limit) {
      projects {
        id
        publicId
        title
        coverImage
        starCount
        forkCount
        createdAt
        user { accountName }
        forkedFrom {
          publicId
          accountName
          sourceDeleted
        }
        metadata {
          songName
          songArtist
          genre
          tags
        }
      }
      total
    }
  }
`;

export function useProjectSearch() {
  const [query, setQuery]     = useState('');
  const [sortBy, setSortBy]   = useState<SearchSort>('RELEVANCE');
  const [results, setResults] = useState<Project[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<unknown>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic id of the latest search; responses from superseded searches are dropped
  // so a slow earlier request can't overwrite results for the current query.
  const requestIdRef = useRef(0);

  const search = useCallback(async (q: string, sort: SearchSort = 'RELEVANCE') => {
    const requestId = ++requestIdRef.current;
    if (!q.trim()) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await gqlRequest<{ searchProjects: SearchResult }>(SEARCH_QUERY, { query: q, sortBy: sort, offset: 0, limit: 20 });
      if (requestId !== requestIdRef.current) return;
      setResults(data.searchProjects.projects);
      setTotal(data.searchProjects.total);
    } catch (err) {
      if (requestId === requestIdRef.current) setError(err);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    // Enter the loading state during the debounce window so consumers don't flash an
    // empty "no results" state before the request is even sent.
    if (q.trim()) setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q, sortBy), 300);
  }, [search, sortBy]);

  const handleSortChange = useCallback((sort: SearchSort) => {
    setSortBy(sort);
    if (query.trim()) search(query, sort);
  }, [search, query]);

  return { query, sortBy, results, total, loading, error, handleQueryChange, handleSortChange };
}
