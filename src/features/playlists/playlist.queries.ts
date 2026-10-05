import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPlaylist } from './playlist.service';

type GraphqlFailure = { graphqlErrors?: Array<{ message?: string }> } | null;

/**
 * One playlist with its projects. The key sits under 'playlists', so any
 * playlist write (see cache-sync) refetches it. `setPlaylist` edits the cached
 * copy in place for changes the page already knows the outcome of.
 *
 * Generic because each page declares the slice of the playlist it reads.
 */
export function usePlaylistDetail<T extends object>(playlistId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['playlists', 'detail', playlistId ?? ''];
  const query = useQuery({
    queryKey,
    queryFn: () => getPlaylist(playlistId!) as Promise<T | null>,
    enabled: !!playlistId,
  });

  const setPlaylist = useCallback(
    (update: (prev: T | null) => T | null) => {
      queryClient.setQueryData<T | null>(queryKey, (prev) => update(prev ?? null));
    },
    // queryKey is rebuilt every render; playlistId is its only varying part.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, playlistId],
  );

  // A private playlist answers with a GraphQL 'forbidden' error, not a null.
  const forbidden = (query.error as GraphqlFailure)?.graphqlErrors?.[0]?.message === 'forbidden';

  return {
    playlist: query.data ?? null,
    loading: !!playlistId && query.isPending,
    forbidden,
    notFound: !playlistId || (query.isError && !forbidden) || query.data === null,
    setPlaylist,
  };
}
