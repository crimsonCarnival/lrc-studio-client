import { request } from '@/app/api.client';
import type { SongConnections } from './song-connections.types';

/**
 * Genius samples, covers and remixes for a song. Resolves null on any failure (no match, Genius down,
 * rate limit, network): the section is an extra, so it hides rather than reporting an error.
 */
export async function getSongConnections(track: string, artist: string): Promise<SongConnections | null> {
  try {
    const qs = new URLSearchParams({ track, artist });
    return await request<SongConnections>(`/lyrics/connections?${qs}`);
  } catch {
    return null;
  }
}
