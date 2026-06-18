import { gqlRequest } from '@/app/graphql.client';
import type { PublicUser, FollowListResult, FollowListType } from '@/types';

const GET_PUBLIC_PROFILE = /* GraphQL */ `
  query GetPublicProfile($accountName: String!) {
    publicProfile(accountName: $accountName) {
      id accountName displayName avatarUrl bio isVerified isAdmin createdAt
      projectCount totalStarsReceived totalForksReceived
      followerCount followingCount isFollowedByMe showFollowers
      badges { id grantedAt }
      progression { xp level }
      stats { minutesSynced }
      streak { current }
      showcasePublic
      showcasedBadges {
        id label { en es } icon color rarity rarityPct holderCount grantedAt
      }
      projects {
        id publicId title starCount forkCount coverImage public
        metadata { songName songArtist songAlbum songYear genre description tags }
        upload { source uploadUrl }
        createdAt updatedAt
      }
    }
  }
`;

const FOLLOW_USER = /* GraphQL */ `
  mutation FollowUser($accountName: String!) {
    follow(accountName: $accountName)
  }
`;

const UNFOLLOW_USER = /* GraphQL */ `
  mutation UnfollowUser($accountName: String!) {
    unfollow(accountName: $accountName)
  }
`;

const GET_FOLLOW_LIST = /* GraphQL */ `
  query GetFollowList($accountName: String!, $type: FollowListType!, $offset: Int) {
    followList(accountName: $accountName, type: $type, offset: $offset) {
      users { id accountName displayName avatarUrl isFollowedByMe }
      total
    }
  }
`;

export async function getPublicProfile(accountName: string): Promise<PublicUser | null> {
  const data = await gqlRequest<{ publicProfile: PublicUser | null }>(GET_PUBLIC_PROFILE, { accountName });
  return data?.publicProfile ?? null;
}

export async function followUser(accountName: string): Promise<boolean> {
  const data = await gqlRequest<{ follow: boolean }>(FOLLOW_USER, { accountName });
  return data?.follow ?? false;
}

export async function unfollowUser(accountName: string): Promise<boolean> {
  const data = await gqlRequest<{ unfollow: boolean }>(UNFOLLOW_USER, { accountName });
  return data?.unfollow ?? false;
}

export async function getFollowList(
  accountName: string,
  type: FollowListType,
  offset = 0
): Promise<FollowListResult> {
  const data = await gqlRequest<{ followList: FollowListResult | null }>(GET_FOLLOW_LIST, { accountName, type, offset });
  return data?.followList ?? { users: [], total: 0 };
}
