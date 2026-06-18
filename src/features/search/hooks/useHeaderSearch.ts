import { useState, useCallback, useRef } from 'react';
import { gqlRequest } from '@/app/graphql.client';
import type { SearchResult, FollowUser, Project } from '@/types';

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
        forkedFrom { publicId accountName }
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
  const [query, setQuery]       = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers]       = useState<FollowUser[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setProjects([]);
      setUsers([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const data = await gqlRequest<{ searchProjects: SearchResult; searchUsers: FollowUser[] }>(HEADER_SEARCH_QUERY, {
        query: q,
        pLimit: projectLimit,
        uLimit: userLimit,
      });
      setProjects(data.searchProjects.projects);
      setTotal(data.searchProjects.total);
      setUsers(data.searchUsers);
    } catch {
      // silently clear on error — full page search shows errors
      setProjects([]);
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectLimit, userLimit]);

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  }, [search]);

  const clear = useCallback(() => {
    setQuery('');
    setProjects([]);
    setUsers([]);
    setTotal(0);
    clearTimeout(debounceRef.current);
  }, []);

  const hasResults = projects.length > 0 || users.length > 0;

  return { query, projects, users, total, loading, hasResults, handleQueryChange, clear };
}
