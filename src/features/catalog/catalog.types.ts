import type {
  CatalogAlbum as GqlCatalogAlbum,
  CatalogArtist as GqlCatalogArtist,
  CatalogDecision,
  CatalogImageSource,
  CatalogKind,
  DetectedAlbum,
} from '@/types/graphql';

export type CatalogArtist = GqlCatalogArtist;
export type CatalogAlbum = GqlCatalogAlbum;
export type { CatalogDecision, CatalogImageSource, CatalogKind, DetectedAlbum };

/** One match from `GET /catalog/genius/artists`; the server only returns matches with a usable photo. */
export type GeniusArtistMatch = { geniusId: number; name: string; imageUrl: string; url: string };

/** The Genius photo after the server copied it to Cloudinary. */
export type GeniusPhoto = { imageUrl: string; sourceUrl: string };

export type CatalogStatus = 'pending' | 'approved' | 'rejected';

export type CatalogQueue = { artists: CatalogArtist[]; albums: CatalogAlbum[] };

export type CatalogEntryEdit = {
  kind: CatalogKind;
  id: string;
  name?: string;
  title?: string;
  bio?: string;
  /** `null` clears the image; `undefined` leaves it alone. */
  imageUrl?: string | null;
  year?: string;
  coverUrl?: string | null;
};

/** For admin edits `undefined` leaves a field alone and `null` on an image clears it. */
export type AdminCatalogEntryEdit = Omit<CatalogEntryEdit, 'imageUrl' | 'coverUrl'> & {
  disambiguation?: string;
  imageUrl?: string | null;
  coverUrl?: string | null;
  imageSource?: CatalogImageSource | null;
  imageSourceUrl?: string | null;
};

export type ReviewInput = {
  kind: CatalogKind;
  id: string;
  decision: CatalogDecision;
  note?: string;
  /** The entry's `updatedAt` when the reviewer opened it; the server rejects with `catalog_changed` if it moved. */
  expectedUpdatedAt?: string;
};

/** An approved album as the artist page shows it: song count and cover come from the artist's primary songs. */
export type CatalogAlbumCard = { album: CatalogAlbum; songCount: number; coverUrl?: string | null };

/** Public catalog page: an approved artist and its approved albums. Reviewer-only fields are null. */
export type CatalogArtistPage = {
  artist: CatalogArtist;
  albums: CatalogAlbum[];
  /** What the page shows: approved catalog albums only, never album titles taken from songs. */
  albumCards: CatalogAlbumCard[];
  /** The signed-in viewer's own artist for this name and their song count; null otherwise. */
  viewerShelf?: { artistId: string; songCount: number } | null;
  /** Every public song crediting the artist, from any user. */
  songs: CatalogSong[];
};

/** Public album page: an approved album of an approved artist and its songs, in track order. */
export type CatalogAlbumPage = {
  artist: CatalogArtist;
  album: CatalogAlbum;
  songs: CatalogSong[];
  coverUrl?: string | null;
};

export type CatalogSong = import('@/features/artists/shelf.service').ShelfProject & { user?: { accountName?: string | null } | null };
