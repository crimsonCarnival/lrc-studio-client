import { gqlRequest } from '@/app/graphql.client';
import type { ProjectPage, PlaylistPage, FollowUser } from '@/types';
import type { ExploreStats } from '@/types/graphql';

const TRENDING_PROJECTS = /* GraphQL */ `
  query TrendingProjects($offset: Int, $limit: Int) {
    trendingProjects(offset: $offset, limit: $limit) {
      projects {
        id
        publicId
        slug
        title
        kind
        coverImage
        trendingScore
        starCount
        forkCount
        viewCount
        metadata { songName songArtist }
        user { id accountName displayName avatarUrl staffRole nameTag { id label { en es } description { en es } icon color } }
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
      avatarUrl staffRole
      isFollowedByMe
      suggestionReason { kind mutualCount mutualName sharedArtistCount sharedArtists }
    }
  }
`;

const EXPLORE_STATS = /* GraphQL */ `
  query ExploreStats {
    exploreStats { totalProjects totalUsers totalPlaylists totalViews totalStars }
  }
`;

export const getExploreStats = (): Promise<ExploreStats | null> =>
  gqlRequest<{ exploreStats: ExploreStats | null }>(EXPLORE_STATS).then((d) => d?.exploreStats ?? null);

export const getTrendingProjects = (offset = 0, limit = 6): Promise<ProjectPage> =>
  gqlRequest<{ trendingProjects: ProjectPage | null }>(TRENDING_PROJECTS, { offset, limit })
    .then((d) => d?.trendingProjects ?? { projects: [], total: 0, hasMore: false });

const TRACK_EXPLORE_EVENTS = /* GraphQL */ `
  mutation TrackExploreEvents($events: [ExploreEventInput!]!) {
    trackExploreEvents(events: $events)
  }
`;

export type ExploreEvent = { publicId: string; type: 'IMPRESSION' | 'CLICK'; position?: number };

// Anonymous feed telemetry for tuning the ranking. Best-effort: a failure here
// must never reach the user, so errors are swallowed.
export const trackExploreEvents = (events: ExploreEvent[]): Promise<void> =>
  events.length === 0
    ? Promise.resolve()
    : gqlRequest(TRACK_EXPLORE_EVENTS, { events }).then(() => undefined, () => undefined);

export const getPopularPlaylists = (offset = 0, limit = 6): Promise<PlaylistPage> =>
  gqlRequest<{ popularPlaylists: PlaylistPage | null }>(POPULAR_PLAYLISTS, { offset, limit })
    .then((d) => d?.popularPlaylists ?? { playlists: [], total: 0, hasMore: false });

export const getSuggestedUsers = (limit = 8): Promise<FollowUser[]> =>
  gqlRequest<{ suggestedUsers: FollowUser[] | null }>(SUGGESTED_USERS, { limit })
    .then((d) => d?.suggestedUsers ?? []);
