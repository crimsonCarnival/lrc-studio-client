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
        forkedFrom {
          publicId
          accountName
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

  const search = useCallback(async (q: string, sort: SearchSort = 'RELEVANCE') => {
    if (!q.trim()) {
      setResults([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await gqlRequest<{ searchProjects: SearchResult }>(SEARCH_QUERY, { query: q, sortBy: sort, offset: 0, limit: 20 });
      setResults(data.searchProjects.projects);
      setTotal(data.searchProjects.total);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q, sortBy), 300);
  }, [search, sortBy]);

  const handleSortChange = useCallback((sort: SearchSort) => {
    setSortBy(sort);
    if (query.trim()) search(query, sort);
  }, [search, query]);

  return { query, sortBy, results, total, loading, error, handleQueryChange, handleSortChange };
}
