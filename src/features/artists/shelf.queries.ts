import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { getArtistShelf, getShelfArtist, setShelfVisibility, type ShelfArtist } from './shelf.service';

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

/** The artist with one visibility flag flipped: the artist row for a null key, else the album whose key matches. */
function withVisibility(artist: ShelfArtist, albumKey: string | null, isPublic: boolean): ShelfArtist {
  return albumKey === null
    ? { ...artist, isPublic }
    : { ...artist, albums: artist.albums.map((a) => (a.key === albumKey ? { ...a, isPublic } : a)) };
}

/**
 * Flips an artist's (or one album's) visibility. The cached shelf is patched first so the control moves at once,
 * then restored with a toast if the server refuses. On success `shelfChanged()` (inside the service) refetches.
 */
export function useSetShelfVisibility(accountName: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useCallback(async (artistId: string, albumKey: string | null, isPublic: boolean) => {
    const queryKey = ['shelf', accountName] as const;
    const previous = queryClient.getQueriesData<ShelfArtist | ShelfArtist[] | null>({ queryKey });
    queryClient.setQueriesData<ShelfArtist | ShelfArtist[] | null>({ queryKey }, (data) => {
      if (Array.isArray(data)) return data.map((a) => (a.id === artistId ? withVisibility(a, albumKey, isPublic) : a));
      return data && data.id === artistId ? withVisibility(data, albumKey, isPublic) : data;
    });
    try {
      await setShelfVisibility(artistId, albumKey, isPublic);
    } catch {
      for (const [key, data] of previous) queryClient.setQueryData(key, data);
      toast.error(t('profile.artists.visibilityFailed'));
    }
  }, [accountName, queryClient, t]);
}
