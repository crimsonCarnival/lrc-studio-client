import { useQuery } from '@tanstack/react-query';
import { getCatalogAlbum, getCatalogArtist, getCatalogSlugs } from './catalog.service';

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
