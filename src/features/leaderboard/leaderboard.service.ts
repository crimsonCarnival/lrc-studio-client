import { gqlRequest } from '@/app/graphql.client';
import type { LeaderboardResult } from '@/types';

const LEADERBOARD_QUERY = /* GraphQL */ `
  query Leaderboard($limit: Int, $offset: Int) {
    leaderboard(limit: $limit, offset: $offset) {
      users {
        id accountName displayName avatarUrl
        badges { id grantedAt }
        stats { minutesSynced secondsSynced wordsSynced karaokeLines syncedLines }
        progression { xp level }
        streak { current }
        projectCount totalStarsReceived totalForksReceived
        rankScore
      }
      total hasMore
    }
  }
`;

const EMPTY: LeaderboardResult = { users: [], total: 0, hasMore: false };

export const getLeaderboard = (limit = 50, offset = 0): Promise<LeaderboardResult> =>
  gqlRequest<{ leaderboard: LeaderboardResult | null }>(LEADERBOARD_QUERY, { limit, offset })
    .then((d) => d?.leaderboard ?? EMPTY);
