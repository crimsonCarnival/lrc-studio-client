import { request } from '@/app/api.client';

export const genius = {
  search: (query) => request(`/lyrics/search?q=${encodeURIComponent(query)}`),
  extract: (url) => request(`/lyrics/extract?url=${encodeURIComponent(url)}`),
};
