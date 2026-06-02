import { gqlRequest } from '@/app/graphql.client.js';

const LEADERBOARD_QUERY = `
  query Leaderboard($limit: Int, $offset: Int) {
    leaderboard(limit: $limit, offset: $offset) {
      users {
        id
        accountName
        displayName
        avatarUrl
        badges { id grantedAt }
        stats { minutesSynced projectCount }
        totalStarsReceived
      }
      total
      hasMore
    }
  }
`;

export const getLeaderboard = (limit = 50, offset = 0) =>
  gqlRequest(LEADERBOARD_QUERY, { limit, offset })
    .then(d => d?.leaderboard ?? { users: [], total: 0, hasMore: false });
