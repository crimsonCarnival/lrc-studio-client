import { request } from '@/app/api.client';

/** One track the server found, ranked best first. Mirrors the server's RankedCandidate. */
export interface TrackSuggestion {
  provider: 'spotify' | 'itunes' | 'deezer';
  trackId: string;
  name: string;
  /** Every credited artist, as the provider lists them ("A, B"). */
  artist: string;
  album: string;
  duration: number;
  albumArt: string | null;
  releaseYear: string | null;
  totalTracks: number | null;
  trackNumber: number | null;
  previewUrl: string | null;
  explicit: boolean;
  genres: string[];
  score: number;
  /** A primary artist you typed is credited on the track. */
  artistMatch: boolean;
  /** Every featured artist you typed is credited. */
  featuredMatch: boolean;
  /** Same title, ignoring "(feat. …)" and the like. */
  titleMatch: boolean;
}

export const songMetadataService = {
  /** The single best track by the artist (404 when none). Prefer `searchTracks`, which lets the person choose. */
  async lookupTrack(songName: string, artistName = ''): Promise<unknown> {
    const params = new URLSearchParams({ songName });
    if (artistName) params.set('artistName', artistName);
    return request(`/song-metadata/lookup?${params}`);
  },

  /** Ranked candidates from every provider: tracks by `artistName` first, then the exact title and the featured artists. */
  async searchTracks(songName: string, artistName = '', featured: readonly string[] = []): Promise<TrackSuggestion[]> {
    const params = new URLSearchParams({ songName });
    if (artistName) params.set('artistName', artistName);
    for (const name of featured.slice(0, 10)) if (name.trim()) params.append('featured', name.trim());
    const res = await request<{ results?: TrackSuggestion[] }>(`/song-metadata/search?${params}`);
    return res?.results ?? [];
  },
};
