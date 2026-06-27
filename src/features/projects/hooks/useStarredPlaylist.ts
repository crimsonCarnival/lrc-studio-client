import { useRef, useCallback } from 'react';
import { getPlaylists, createPlaylist, addProjectToPlaylist, removeProjectFromPlaylist } from '@features/playlists/playlist.service';
import { useTranslation } from 'react-i18next';


interface StarUser {
  accountName?: string | null;
  [key: string]: unknown;
}

// Finds or lazily creates the "Starred Projects" playlist for the current user,
// then keeps it in sync with star/unstar actions.
export function useStarredPlaylist(user: StarUser | null | undefined) {
  const { t } = useTranslation();
  const playlistName = t('projectView.newPlaylist', { defaultValue: 'Starred Projects' });
  const playlistIdRef = useRef<string | null>(null);
  const resolving = useRef(false);

  const getOrCreate = useCallback(async (): Promise<string | null> => {
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
      const playlists = await getPlaylists(accountName) as { id: string; name: string; tags: string[] }[];
      const existing = playlists.find((p) => p.tags?.includes('starred'));
      if (existing) {
        playlistIdRef.current = existing.id;
        return existing.id;
      }

      const created = await createPlaylist({
        name: playlistName,
        description: '',
        isPublic: false,
        tags: ['starred'],
      });
      playlistIdRef.current = created?.id ?? null;
      return playlistIdRef.current;
    } catch {
      return null;
    } finally {
      resolving.current = false;
    }
  }, [user, playlistName]);

  const addToStarred = useCallback(
    async (publicId: string) => {
      const id = await getOrCreate();
      if (id) await addProjectToPlaylist(id, publicId).catch(() => {});
    },
    [getOrCreate],
  );

  const removeFromStarred = useCallback(
    async (publicId: string) => {
      const id = await getOrCreate();
      if (id) await removeProjectFromPlaylist(id, publicId).catch(() => {});
    },
    [getOrCreate],
  );

  return { addToStarred, removeFromStarred };
}
