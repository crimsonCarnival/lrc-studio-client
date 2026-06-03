import { gqlRequest } from '@/app/graphql.client.js';

const MY_MUSIC_LIBRARY_QUERY = `
  query MyMusicLibrary {
    myMusicLibrary {
      artist album genre language trackCount
    }
  }
`;

export const getMyMusicLibrary = () =>
  gqlRequest(MY_MUSIC_LIBRARY_QUERY)
    .then((d) => d?.myMusicLibrary ?? []);
