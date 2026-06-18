import { gqlRequest } from '@/app/graphql.client';
import type { MusicLibraryEntry } from '@/types';

const MY_MUSIC_LIBRARY_QUERY = /* GraphQL */ `
  query MyMusicLibrary {
    myMusicLibrary {
      artist album genre language trackCount
    }
  }
`;

export const getMyMusicLibrary = (): Promise<MusicLibraryEntry[]> =>
  gqlRequest<{ myMusicLibrary: MusicLibraryEntry[] | null }>(MY_MUSIC_LIBRARY_QUERY)
    .then((d) => d?.myMusicLibrary ?? []);
