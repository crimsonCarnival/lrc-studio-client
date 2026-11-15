import { useQuery } from '@tanstack/react-query';
import { getArtistShelf, getShelfArtist } from './shelf.service';

export const shelfKeys = {
  list: (accountName: string, asVisitor: boolean, withTracks: boolean) => ['shelf', accountName, asVisitor, withTracks] as const,
  artist: (accountName: string, artistId: string, asVisitor: boolean) => ['shelf', accountName, 'artist', artistId, asVisitor] as const,
};

/** A user's artist shelf. Keyed under 'shelf', so cache-sync refetches it after a visibility change or a project edit. */
export function useArtistShelf(accountName: string | undefined, opts: { asVisitor: boolean; withTracks?: boolean; enabled?: boolean }) {
  const { asVisitor, withTracks = false, enabled = true } = opts;
  return useQuery({
    queryKey: shelfKeys.list(accountName ?? '', asVisitor, withTracks),
    queryFn: () => getArtistShelf(accountName!, { asVisitor, withTracks }),
    enabled: !!accountName && enabled,
  });
}

/** One artist with albums and tracks; null data when it is missing or hidden from this viewer. */
export function useShelfArtist(accountName: string | undefined, artistId: string | undefined, asVisitor: boolean) {
  return useQuery({
    queryKey: shelfKeys.artist(accountName ?? '', artistId ?? '', asVisitor),
    queryFn: () => getShelfArtist(accountName!, artistId!, asVisitor),
    enabled: !!accountName && !!artistId,
  });
}
