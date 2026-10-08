import { gqlRequest } from '@/app/graphql.client';
import type {
  LeaderboardResult,
  LeaderboardSort,
  LeaderboardSortDirection,
  LeaderboardTimeframe,
} from '@/types';

// Re-exported so the page imports its sort/timeframe vocabulary from the service
// that owns the query, rather than redeclaring it.
export type { LeaderboardSort, LeaderboardSortDirection, LeaderboardTimeframe };

export type GetLeaderboardParams = {
  limit?: number;
  offset?: number;
  timeframe?: LeaderboardTimeframe;
  sortBy?: LeaderboardSort;
  sortDir?: LeaderboardSortDirection;
};

const LEADERBOARD_QUERY = /* GraphQL */ `
  query Leaderboard(
    $limit: Int
    $offset: Int
    $timeframe: LeaderboardTimeframe
    $sortBy: LeaderboardSort
    $sortDir: LeaderboardSortDirection
  ) {
    leaderboard(limit: $limit, offset: $offset, timeframe: $timeframe, sortBy: $sortBy, sortDir: $sortDir) {
      users {
        id accountName displayName avatarUrl
        badges { id grantedAt }
        stats { minutesSynced secondsSynced wordsSynced karaokeLines syncedLines aiSyncedLines aiWordsSynced }
        progression { xp level }
        streak { current }
        projectCount totalStarsReceived totalForksReceived
        rankScore periodXp
      }
      total hasMore
    }
  }
`;

const EMPTY: LeaderboardResult = { users: [], total: 0, hasMore: false };

export const getLeaderboard = ({
  limit = 50,
  offset = 0,
  timeframe = 'ALL_TIME',
  sortBy = 'RANK',
  sortDir = 'DESC',
}: GetLeaderboardParams = {}): Promise<LeaderboardResult> =>
  gqlRequest<{ leaderboard: LeaderboardResult | null }>(LEADERBOARD_QUERY, {
    limit,
    offset,
    timeframe,
    sortBy,
    sortDir,
  }).then((d) => d?.leaderboard ?? EMPTY);
