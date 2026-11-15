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

export type AdminCatalogEntryEdit = CatalogEntryEdit & { disambiguation?: string };

export type ReviewInput = {
  kind: CatalogKind;
  id: string;
  decision: CatalogDecision;
  note?: string;
  /** The entry's `updatedAt` when the reviewer opened it; the server rejects with `catalog_changed` if it moved. */
  expectedUpdatedAt?: string;
};
