import { gqlRequest } from '@/app/graphql.client';
import type { ProjectPage, PlaylistPage, FollowUser } from '@/types';

const TRENDING_PROJECTS = /* GraphQL */ `
  query TrendingProjects($offset: Int, $limit: Int) {
    trendingProjects(offset: $offset, limit: $limit) {
      projects {
        id
        publicId
        title
        coverImage
        trendingScore
        starCount
        forkCount
        user { id accountName displayName avatarUrl }
      }
      total
      hasMore
    }
  }
`;

const POPULAR_PLAYLISTS = /* GraphQL */ `
  query PopularPlaylists($offset: Int, $limit: Int) {
    popularPlaylists(offset: $offset, limit: $limit) {
      playlists {
        id
        name
        description
        coverImage
        trendingScore
        savedCount
        projectCount
        isPublic
        owner { id accountName displayName avatarUrl }
      }
      total
      hasMore
    }
  }
`;

const SUGGESTED_USERS = /* GraphQL */ `
  query SuggestedUsers($limit: Int) {
    suggestedUsers(limit: $limit) {
      id
      accountName
      displayName
      avatarUrl
    }
  }
`;

export const getTrendingProjects = (offset = 0, limit = 6): Promise<ProjectPage> =>
  gqlRequest<{ trendingProjects: ProjectPage | null }>(TRENDING_PROJECTS, { offset, limit })
    .then((d) => d?.trendingProjects ?? { projects: [], total: 0, hasMore: false });

export const getPopularPlaylists = (offset = 0, limit = 6): Promise<PlaylistPage> =>
  gqlRequest<{ popularPlaylists: PlaylistPage | null }>(POPULAR_PLAYLISTS, { offset, limit })
    .then((d) => d?.popularPlaylists ?? { playlists: [], total: 0, hasMore: false });

export const getSuggestedUsers = (limit = 8): Promise<FollowUser[]> =>
  gqlRequest<{ suggestedUsers: FollowUser[] | null }>(SUGGESTED_USERS, { limit })
    .then((d) => d?.suggestedUsers ?? []);
