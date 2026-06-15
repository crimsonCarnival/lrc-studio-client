import { useState, useCallback, useRef } from 'react';
import { gqlRequest } from '@/app/graphql.client.js';

const SEARCH_QUERY = `
  query SearchProjects($query: String!, $sortBy: SearchSort, $offset: Int, $limit: Int) {
    searchProjects(query: $query, sortBy: $sortBy, offset: $offset, limit: $limit) {
      projects {
        id
        projectId
        title
        coverImage
        starCount
        forkCount
        createdAt
        forkedFrom {
          projectId
          accountName
        }
        metadata {
          songName
          songArtist
          tags
        }
      }
      total
    }
  }
`;

export function useProjectSearch() {
  const [query, setQuery]     = useState('');
  const [sortBy, setSortBy]   = useState('RELEVANCE');
  const [results, setResults] = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const debounceRef = useRef(null);

  const search = useCallback(async (q, sort = 'RELEVANCE') => {
    if (!q.trim()) {
      setResults([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await gqlRequest(SEARCH_QUERY, { query: q, sortBy: sort, offset: 0, limit: 20 });
      setResults(data.searchProjects.projects);
      setTotal(data.searchProjects.total);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback((q) => {
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q, sortBy), 300);
  }, [search, sortBy]);

  const handleSortChange = useCallback((sort) => {
    setSortBy(sort);
    if (query.trim()) search(query, sort);
  }, [search, query]);

  return { query, sortBy, results, total, loading, error, handleQueryChange, handleSortChange };
}
