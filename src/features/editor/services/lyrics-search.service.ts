import { request } from '@/app/api.client';

/** A search hit. `synced` is only reported by providers that know it up front (LRCLIB). */
export type LyricsSearchHit = {
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  duration?: number | null;
  synced?: boolean;
  thumbnail?: string | null;
  url?: string | null;
  provider: LyricsProvider | 'genius';
};

export type LyricsProvider = 'lrclib' | 'lyricfind' | 'lyricsovh';

export type LyricsExtractResult = {
  /** Plain text, or LRC (`[mm:ss.xx] line`) when `synced` is true. */
  lyrics: string;
  synced: boolean;
  provider: LyricsProvider;
};

export type ExtractOptions = {
  album?: string | null;
  /** Track length in seconds. Greatly improves match accuracy — send it whenever media is loaded. */
  duration?: number | null;
  /** The hit's id, so the server can resolve it back to the exact record rather than re-matching. */
  id?: string | null;
};

export const lyricsSearch = {
  search: (query: string): Promise<{ results: LyricsSearchHit[] }> =>
    request(`/lyrics/search?q=${encodeURIComponent(query)}`) as Promise<{ results: LyricsSearchHit[] }>,

  extract: (track: string, artist: string, options: ExtractOptions = {}): Promise<LyricsExtractResult> => {
    const params = new URLSearchParams({ track, artist });
    if (options.album) params.set('album', options.album);
    if (options.duration) params.set('duration', String(Math.round(options.duration)));
    if (options.id) params.set('id', options.id);
    return request(`/lyrics/extract?${params}`) as Promise<LyricsExtractResult>;
  },
};
