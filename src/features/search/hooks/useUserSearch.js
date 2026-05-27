import { useState, useCallback, useRef } from 'react';
import { gqlRequest } from '@/app/graphql.client.js';

const SEARCH_USERS_QUERY = `
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
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const debounceRef           = useRef(null);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await gqlRequest(SEARCH_USERS_QUERY, { query: q, limit: 20 });
      setResults(data.searchUsers);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback((q) => {
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  }, [search]);

  return { query, results, loading, error, handleQueryChange, setQuery };
}
