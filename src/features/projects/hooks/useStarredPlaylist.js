import { useRef, useCallback } from 'react';
import { getPlaylists, createPlaylist, addProjectToPlaylist, removeProjectFromPlaylist } from '@features/playlists/playlist.service';

const STARRED_NAME = 'Starred Projects';

// Finds or lazily creates the "Starred Projects" playlist for the current user,
// then keeps it in sync with star/unstar actions.
export function useStarredPlaylist(user) {
  const playlistIdRef = useRef(null);
  const resolving = useRef(false);

  const getOrCreate = useCallback(async () => {
    if (playlistIdRef.current) return playlistIdRef.current;
    const accountName = user?.accountName;
    if (!accountName) return null;

    // Deduplicate concurrent calls
    if (resolving.current) {
      await new Promise((r) => setTimeout(r, 150));
      return playlistIdRef.current;
    }

    resolving.current = true;
    try {
      const playlists = await getPlaylists(accountName);
      const existing = playlists.find((p) => p.name === STARRED_NAME);
      if (existing) {
        playlistIdRef.current = existing.id;
        return existing.id;
      }

      const created = await createPlaylist({
        name: STARRED_NAME,
        description: '',
        isPublic: false,
      });
      playlistIdRef.current = created?.id ?? null;
      return playlistIdRef.current;
    } catch {
      return null;
    } finally {
      resolving.current = false;
    }
  }, [user]);

  const addToStarred = useCallback(
    async (projectId) => {
      const id = await getOrCreate();
      if (id) await addProjectToPlaylist(id, projectId).catch(() => {});
    },
    [getOrCreate],
  );

  const removeFromStarred = useCallback(
    async (projectId) => {
      const id = await getOrCreate();
      if (id) await removeProjectFromPlaylist(id, projectId).catch(() => {});
    },
    [getOrCreate],
  );

  return { addToStarred, removeFromStarred };
}
