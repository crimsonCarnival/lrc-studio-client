import { gqlRequest } from '@/app/graphql.client.js';

const TRENDING_PROJECTS = `
  query TrendingProjects($offset: Int, $limit: Int) {
    trendingProjects(offset: $offset, limit: $limit) {
      projects {
        id
        projectId
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

const POPULAR_PLAYLISTS = `
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

const SUGGESTED_USERS = `
  query SuggestedUsers($limit: Int) {
    suggestedUsers(limit: $limit) {
      id
      accountName
      displayName
      avatarUrl
    }
  }
`;

const EXPLORE_STATS = `
  query ExploreStats {
    exploreStats {
      totalProjects
      totalUsers
      totalPlaylists
    }
  }
`;

export const getTrendingProjects = (offset = 0, limit = 6) =>
  gqlRequest(TRENDING_PROJECTS, { offset, limit }).then(d => d?.trendingProjects ?? { projects: [], total: 0, hasMore: false });

export const getPopularPlaylists = (offset = 0, limit = 6) =>
  gqlRequest(POPULAR_PLAYLISTS, { offset, limit }).then(d => d?.popularPlaylists ?? { playlists: [], total: 0, hasMore: false });

export const getSuggestedUsers = (limit = 8) =>
  gqlRequest(SUGGESTED_USERS, { limit }).then(d => d?.suggestedUsers ?? []);

export const getExploreStats = () =>
  gqlRequest(EXPLORE_STATS).then(d => d?.exploreStats ?? { totalProjects: 0, totalUsers: 0, totalPlaylists: 0 });
