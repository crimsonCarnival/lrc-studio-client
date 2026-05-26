import { request } from '@/app/api.client';

export const lyricsSearch = {
  search: (query) => request(`/lyrics/search?q=${encodeURIComponent(query)}`),
  extract: (track, artist) => request(`/lyrics/extract?track=${encodeURIComponent(track)}&artist=${encodeURIComponent(artist)}`),
};
