import { gqlRequest } from '@/app/graphql.client';

const GET_PUBLIC_PROFILE = `
  query GetPublicProfile($accountName: String!) {
    publicProfile(accountName: $accountName) {
      id
      accountName
      displayName
      avatarUrl
      bio
      isVerified
      role
      createdAt
      projectCount
      totalStarsReceived
      projects {
        id
        projectId
        title
        starCount
        forkCount
        metadata { songName songArtist description tags }
        upload { source youtubeUrl cloudinaryUrl }
        createdAt
        updatedAt
      }
    }
  }
`;

export async function getPublicProfile(accountName) {
  const data = await gqlRequest(GET_PUBLIC_PROFILE, { accountName });
  return data?.publicProfile ?? null;
}
