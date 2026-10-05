import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { gqlRequest } from '@/app/graphql.client';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

/** Search results change slowly; going back to a recent search should not refetch. */
export const SEARCH_STALE_MS = 30_000;
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

const NO_RESULTS: Project[] = [];

export function useProjectSearch() {
  const [query, setQuery]   = useState('');
  const [sortBy, setSortBy] = useState<SearchSort>('RELEVANCE');
  // The request follows the settled text; a sort change applies immediately.
  const term = useDebouncedValue(query, 300).trim();

  // Each (term, sort) is its own cache entry, so a slow response for an earlier
  // search can never land on the current one, and retyping a recent search is instant.
  const search = useQuery({
    queryKey: ['search', 'projects', term, sortBy],
    queryFn: async () => (await gqlRequest<{ searchProjects: SearchResult }>(SEARCH_QUERY, { query: term, sortBy, offset: 0, limit: 20 })).searchProjects,
    enabled: !!term,
    staleTime: SEARCH_STALE_MS,
    // Keep the previous results on screen while the next search loads.
    placeholderData: keepPreviousData,
  });

  const typed = query.trim();
  const results = typed && term ? search.data?.projects ?? NO_RESULTS : NO_RESULTS;
  const total = typed && term ? search.data?.total ?? 0 : 0;
  // Also loading during the debounce window, so consumers don't flash an empty
  // "no results" state before the request is even sent.
  const loading = !!typed && (typed !== term || search.isFetching);

  return { query, sortBy, results, total, loading, error: search.error, handleQueryChange: setQuery, handleSortChange: setSortBy };
}
