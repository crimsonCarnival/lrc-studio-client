import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { browseCatalogArtists, getCatalogAlbum, getCatalogAlbumSuggestions, getCatalogArtist, getCatalogArtistsNamed, getCatalogSlugs } from './catalog.service';

export const MY_SUBMISSIONS_KEY = ['catalog', 'my-submissions'] as const;

export const catalogArtistKey = (slug: string) => ['catalog', 'artist', slug] as const;

/** One approved catalog artist with its albums; `data` is null when it does not exist. */
export function useCatalogArtist(slug: string | undefined) {
  return useQuery({
    queryKey: catalogArtistKey(slug ?? ''),
    queryFn: () => getCatalogArtist(slug!),
    enabled: !!slug,
  });
}

export const catalogAlbumKey = (artistSlug: string, albumSlug: string) => ['catalog', 'album', artistSlug, albumSlug] as const;

/** One approved catalog album with its songs; `data` is null when it does not exist. */
export function useCatalogAlbum(artistSlug: string | undefined, albumSlug: string | undefined) {
  return useQuery({
    queryKey: catalogAlbumKey(artistSlug ?? '', albumSlug ?? ''),
    queryFn: () => getCatalogAlbum(artistSlug!, albumSlug!),
    enabled: !!artistSlug && !!albumSlug,
  });
}

/** Catalog album titles for an artist name, for setup's album field. Empty while loading, on error, or with no artist. */
export function useCatalogAlbumSuggestions(artist: string | undefined): string[] {
  const name = artist?.trim() ?? '';
  const { data } = useQuery({
    queryKey: ['catalog', 'album-suggestions', name.normalize('NFC').toLowerCase()] as const,
    queryFn: () => getCatalogAlbumSuggestions(name),
    enabled: name.length > 0,
    staleTime: 5 * 60_000,
  });
  return (data ?? []).map((a) => a.name);
}

export type CatalogArtistMatch =
  | { state: 'idle' | 'loading' | 'none' | 'many' }
  | { state: 'one'; artist: { id: string; name: string; slug: string | null } };

/** Whether an artist name is already in the catalog: 'none' is the only answer that invites a suggestion. */
export function useCatalogArtistMatch(name: string | undefined): CatalogArtistMatch {
  const trimmed = name?.trim() ?? '';
  const { data, isPending, isError } = useQuery({
    queryKey: ['catalog', 'artists-named', trimmed.normalize('NFC').toLowerCase()] as const,
    queryFn: () => getCatalogArtistsNamed(trimmed),
    enabled: trimmed.length > 0,
    staleTime: 5 * 60_000,
  });
  // A failed lookup must not tell anyone the artist is missing.
  if (!trimmed || isError) return { state: 'idle' };
  if (isPending) return { state: 'loading' };
  if (data.length === 0) return { state: 'none' };
  return data.length === 1 ? { state: 'one', artist: data[0] } : { state: 'many' };
}

/** Paged public browse of approved artists for a (debounced) search string. */
export function useCatalogBrowse(query: string) {
  const q = query.trim();
  const result = useInfiniteQuery({
    queryKey: ['catalog', 'browse', q.normalize('NFC').toLowerCase()] as const,
    queryFn: ({ pageParam }) => browseCatalogArtists(q, pageParam),
    initialPageParam: 0,
    staleTime: 60_000,
    // The server pages by offset, so the cursor is the count loaded so far.
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.items.length, 0);
      return last.items.length > 0 && loaded < last.total ? loaded : undefined;
    },
  });
  const artists = useMemo(() => result.data?.pages.flatMap((p) => p.items) ?? [], [result.data]);
  return { artists, total: result.data?.pages[0]?.total ?? 0, ...result };
}

/** name key (NFC, lower-case) -> catalog slug, for the given artist names. Empty while loading or on error. */
export function useCatalogSlugs(names: string[]): Map<string, string> {
  const keys = [...new Set(names.map((n) => n.normalize('NFC').toLowerCase()))].sort();
  const { data } = useQuery({
    queryKey: ['catalog', 'slugs', keys] as const,
    queryFn: () => getCatalogSlugs(keys),
    enabled: keys.length > 0,
    staleTime: 5 * 60_000,
  });
  return new Map((data ?? []).map((r) => [r.key, r.slug]));
}
