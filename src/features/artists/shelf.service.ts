import { gqlRequest } from '@/app/graphql.client';
import { shelfChanged } from '@/app/cache-sync';
import { PROJECT_LIST_FIELDS } from '@/features/projects/services/projects.service';
import type { ShelfAlbum as GqlShelfAlbum, ShelfArtist as GqlShelfArtist } from '@/types/graphql';

/** A shelf track's project: the Library list's `ProjectListFields` plus what the shelf screens add. */
export type ShelfProject = {
  id: string;
  publicId: string;
  slug?: string | null;
  title?: string | null;
  kind?: 'song' | 'subtitles' | null;
  public?: boolean | null;
  hasWordSync?: boolean | null;
  lineCount?: number | null;
  syncedLineCount?: number | null;
  coverImage?: string | null;
  user?: { accountName?: string | null } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  contentUpdatedAt?: string | null;
  starCount?: number | null;
  forkCount?: number | null;
  viewCount?: number | null;
  shareCount?: number | null;
  metadata?: {
    songName?: string | null;
    songArtist?: string | null;
    songAlbum?: string | null;
    genre?: string | null;
    tags?: string[] | null;
    artists?: Array<{ name: string; role: 'primary' | 'featured'; order: number }> | null;
    // The rest of ProjectListFields: the Library metadata editor saves `metadata` wholesale from these.
    description?: string | null;
    singers?: string[] | null;
    singerColors?: string[] | null;
    songYear?: string | number | null;
    songLanguage?: string | null;
    trackNumber?: number | null;
    trackCount?: number | null;
  } | null;
  type?: string | null;
  readOnly?: boolean | null;
  listed?: boolean | null;
  forkedFrom?: { publicId?: string | null; userId?: string | null; accountName?: string | null; sourceDeleted?: boolean | null } | null;
  upload?: { id?: string | null; fileName?: string | null; title?: string | null; source?: string | null; uploadUrl?: string | null; coverImage?: string | null; duration?: number | null } | null;
};

export type ShelfTrack = { project: ShelfProject; trackNumber?: number | null };
export type ShelfAlbum = Omit<GqlShelfAlbum, 'tracks'> & { tracks: ShelfTrack[] };
export type ShelfArtist = Omit<GqlShelfArtist, 'albums'> & { albums: ShelfAlbum[] };

// A real fragment appended by concatenation (not interpolation), like playlist.service.ts.
const SHELF_ARTIST_FIELDS = /* GraphQL */ `
  fragment ShelfArtistFields on ShelfArtist {
    id name isPublic songCount albumCount coverImage latestEditAt
    albums {
      key title year isPublic trackCount coverImage
      tracks {
        trackNumber
        project { ...ProjectListFields hasWordSync user { accountName } }
      }
    }
  }
` + PROJECT_LIST_FIELDS;

const GET_SHELF = /* GraphQL */ `
  query ArtistShelf($accountName: String!, $asVisitor: Boolean, $withTracks: Boolean) {
    artistShelf(accountName: $accountName, asVisitor: $asVisitor, withTracks: $withTracks) { ...ShelfArtistFields }
  }
` + SHELF_ARTIST_FIELDS;

const GET_SHELF_ARTIST = /* GraphQL */ `
  query ArtistShelfArtist($accountName: String!, $artistId: ID!, $asVisitor: Boolean) {
    artistShelfArtist(accountName: $accountName, artistId: $artistId, asVisitor: $asVisitor) { ...ShelfArtistFields }
  }
` + SHELF_ARTIST_FIELDS;

const SET_SHELF_VISIBILITY = /* GraphQL */ `
  mutation SetShelfVisibility($artistId: ID!, $albumKey: String, $isPublic: Boolean!) {
    setShelfVisibility(artistId: $artistId, albumKey: $albumKey, isPublic: $isPublic)
  }
`;

type ShelfOptions = { asVisitor?: boolean; withTracks?: boolean };

/** `asVisitor` asks for the visitor projection (the owner's "view as others" preview). */
export async function getArtistShelf(accountName: string, { asVisitor = false, withTracks = false }: ShelfOptions = {}): Promise<ShelfArtist[]> {
  const data = await gqlRequest<{ artistShelf: ShelfArtist[] }>(GET_SHELF, { accountName, asVisitor, withTracks });
  return data.artistShelf;
}

export async function getShelfArtist(accountName: string, artistId: string, asVisitor = false): Promise<ShelfArtist | null> {
  const data = await gqlRequest<{ artistShelfArtist: ShelfArtist | null }>(GET_SHELF_ARTIST, { accountName, artistId, asVisitor });
  return data.artistShelfArtist ?? null;
}

/** `albumKey` null changes the artist row; a key changes that album (`''` is the singles bucket). Throws on failure. */
export async function setShelfVisibility(artistId: string, albumKey: string | null, isPublic: boolean): Promise<void> {
  await gqlRequest<{ setShelfVisibility: boolean }>(SET_SHELF_VISIBILITY, { artistId, albumKey, isPublic });
  shelfChanged();
}
