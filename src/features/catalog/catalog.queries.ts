import { useQuery } from '@tanstack/react-query';
import { getCatalogArtist } from './catalog.service';

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
