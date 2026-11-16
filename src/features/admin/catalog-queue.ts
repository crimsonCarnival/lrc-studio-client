import type { CatalogAlbum, CatalogArtist } from '@/features/catalog/catalog.types';

export type QueueEntry =
  | { kind: 'artist'; entry: CatalogArtist }
  | { kind: 'album'; entry: CatalogAlbum };

export const entryName = (e: QueueEntry): string => (e.kind === 'artist' ? e.entry.name : e.entry.title);
