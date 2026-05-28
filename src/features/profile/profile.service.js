import { gqlRequest } from '@/app/graphql.client';

const GET_PUBLIC_PROFILE = `
  query GetPublicProfile($accountName: String!) {
    publicProfile(accountName: $accountName) {
      id accountName displayName avatarUrl bio isVerified isAdmin createdAt
      projectCount totalStarsReceived totalForksReceived
      followerCount followingCount isFollowedByMe showFollowers
      projects {
        id projectId title starCount forkCount
        metadata { songName songArtist description tags }
        upload { source youtubeUrl cloudinaryUrl }
        createdAt updatedAt
      }
    }
  }
`;

const FOLLOW_USER = `
  mutation FollowUser($accountName: String!) {
    follow(accountName: $accountName)
  }
`;

const UNFOLLOW_USER = `
  mutation UnfollowUser($accountName: String!) {
    unfollow(accountName: $accountName)
  }
`;

const GET_FOLLOW_LIST = `
  query GetFollowList($accountName: String!, $type: FollowListType!, $offset: Int) {
    followList(accountName: $accountName, type: $type, offset: $offset) {
      users { id accountName displayName avatarUrl isFollowedByMe }
      total
    }
  }
`;

export async function getPublicProfile(accountName) {
  const data = await gqlRequest(GET_PUBLIC_PROFILE, { accountName });
  return data?.publicProfile ?? null;
}

export async function followUser(accountName) {
  const data = await gqlRequest(FOLLOW_USER, { accountName });
  return data?.follow ?? false;
}

export async function unfollowUser(accountName) {
  const data = await gqlRequest(UNFOLLOW_USER, { accountName });
  return data?.unfollow ?? false;
}

export async function getFollowList(accountName, type, offset = 0) {
  const data = await gqlRequest(GET_FOLLOW_LIST, { accountName, type, offset });
  return data?.followList ?? { users: [], total: 0 };
}
