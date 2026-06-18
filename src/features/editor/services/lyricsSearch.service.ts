import { request } from '@/app/api.client';

export const lyricsSearch = {
  search: (query: string): Promise<unknown> => request(`/lyrics/search?q=${encodeURIComponent(query)}`),
  extract: (track: string, artist: string): Promise<unknown> =>
    request(`/lyrics/extract?track=${encodeURIComponent(track)}&artist=${encodeURIComponent(artist)}`),
};
