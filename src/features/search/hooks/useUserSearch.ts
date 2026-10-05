import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { gqlRequest } from '@/app/graphql.client';
import type { FollowUser } from '@/types';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { cacheResults, getSuggestions } from '../search.cache';
import { SEARCH_STALE_MS } from './useProjectSearch';

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

const NO_USERS: FollowUser[] = [];
const NO_SUGGESTIONS: string[] = [];

export function useUserSearch() {
  const [query, setQuery] = useState('');
  const term = useDebouncedValue(query, 300).trim();

  const search = useQuery({
    queryKey: ['search', 'users', term],
    queryFn: async () => {
      const { searchUsers } = await gqlRequest<{ searchUsers: FollowUser[] }>(SEARCH_USERS_QUERY, { query: term, limit: 20 });
      // Feeds the prefix index that getSuggestions reads from.
      cacheResults(searchUsers);
      return searchUsers;
    },
    enabled: !!term,
    staleTime: SEARCH_STALE_MS,
    placeholderData: keepPreviousData,
  });

  const results = term ? search.data ?? NO_USERS : NO_USERS;
  // Recomputed when results arrive, since each response grows the prefix index.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const localSuggestions = useMemo(() => (term ? getSuggestions(term) : NO_SUGGESTIONS), [term, search.data]);

  return { query, results, loading: !!term && search.isFetching, error: search.error, localSuggestions, handleQueryChange: setQuery, setQuery };
}
