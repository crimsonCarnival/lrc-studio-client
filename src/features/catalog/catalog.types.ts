import type {
  CatalogAlbum as GqlCatalogAlbum,
  CatalogArtist as GqlCatalogArtist,
  CatalogDecision,
  CatalogKind,
} from '@/types/graphql';

export type CatalogArtist = GqlCatalogArtist;
export type CatalogAlbum = GqlCatalogAlbum;
export type { CatalogDecision, CatalogKind };

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
};

export type ReviewInput = {
  kind: CatalogKind;
  id: string;
  decision: CatalogDecision;
  note?: string;
  /** The entry's `updatedAt` when the reviewer opened it; the server rejects with `catalog_changed` if it moved. */
  expectedUpdatedAt?: string;
};

/** Public catalog page: an approved artist and its approved albums. Reviewer-only fields are null. */
export type CatalogArtistPage = {
  artist: CatalogArtist;
  albums: CatalogAlbum[];
  /** Every public song crediting the artist, from any user. */
  songs: CatalogSong[];
};

export type CatalogSong = import('@/features/artists/shelf.service').ShelfProject & { user?: { accountName?: string | null } | null };
