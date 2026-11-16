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
  imageUrl?: string;
  year?: string;
  coverUrl?: string;
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
