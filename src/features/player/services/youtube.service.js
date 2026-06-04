import { request } from '@/app/api.client';

export const youtube = {
  search: async (query) => {
    return request(`/youtube/search?q=${encodeURIComponent(query)}`);
  },
  checkEmbed: async (videoId) => {
    return request(`/youtube/check-embed?videoId=${encodeURIComponent(videoId)}`);
  },
};
