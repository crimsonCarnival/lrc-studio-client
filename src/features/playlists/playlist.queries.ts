import { useCallback } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPlaylist,
  getPlaylistsPage,
  getSavedPlaylistsPage,
  type PlaylistsPageParams,
  type SavedPlaylistsPageParams,
} from './playlist.service';

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

/**
 * One page of a user's lists. Keyed under 'playlists' so cache-sync refetches it
 * after any playlist write; the previous page stays on screen while the next loads.
 */
export function usePlaylistsPage(accountName: string | undefined, params: PlaylistsPageParams = {}) {
  return useQuery({
    queryKey: ['playlists', 'page', accountName ?? '', params],
    queryFn: () => getPlaylistsPage(accountName!, params),
    enabled: !!accountName,
    placeholderData: keepPreviousData,
  });
}

/** One page of the viewer's saved lists. Pass `enabled: false` when the viewer can't have any (signed out, not the owner). */
export function useSavedPlaylistsPage(params: SavedPlaylistsPageParams = {}, enabled = true) {
  return useQuery({
    queryKey: ['playlists', 'saved', params],
    queryFn: () => getSavedPlaylistsPage(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}
