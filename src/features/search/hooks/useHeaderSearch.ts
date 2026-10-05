import { useState, useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { gqlRequest } from '@/app/graphql.client';
import type { SearchResult, FollowUser, Project } from '@/types';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { SEARCH_STALE_MS } from './useProjectSearch';

const NO_PROJECTS: Project[] = [];
const NO_USERS: FollowUser[] = [];

const HEADER_SEARCH_QUERY = /* GraphQL */ `
  query HeaderSearch($query: String!, $pLimit: Int, $uLimit: Int) {
    searchProjects(query: $query, sortBy: RELEVANCE, offset: 0, limit: $pLimit) {
      projects {
        id
        publicId
        title
        coverImage
        starCount
        forkCount
        forkedFrom { publicId accountName sourceDeleted }
        metadata { songName songArtist }
      }
      total
    }
    searchUsers(query: $query, limit: $uLimit) {
      id
      accountName
      displayName
      avatarUrl
    }
  }
`;

export function useHeaderSearch({ projectLimit = 5, userLimit = 3 }: { projectLimit?: number; userLimit?: number } = {}) {
  const [query, setQuery] = useState('');
  const term = useDebouncedValue(query, 300).trim();

  const search = useQuery({
    queryKey: ['search', 'header', term, projectLimit, userLimit],
    queryFn: () => gqlRequest<{ searchProjects: SearchResult; searchUsers: FollowUser[] }>(HEADER_SEARCH_QUERY, {
      query: term,
      pLimit: projectLimit,
      uLimit: userLimit,
    }),
    enabled: !!term,
    staleTime: SEARCH_STALE_MS,
    placeholderData: keepPreviousData,
  });

  // Empty while the box is empty and on error — the full search page shows errors.
  const data = query.trim() && term && !search.isError ? search.data : undefined;
  const projects = data?.searchProjects.projects ?? NO_PROJECTS;
  const users = data?.searchUsers ?? NO_USERS;
  const total = data?.searchProjects.total ?? 0;
  const loading = !!term && search.isFetching;

  const clear = useCallback(() => setQuery(''), []);
  const handleQueryChange = setQuery;

  const hasResults = projects.length > 0 || users.length > 0;

  return { query, projects, users, total, loading, hasResults, handleQueryChange, clear };
}
