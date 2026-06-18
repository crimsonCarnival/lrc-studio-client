import { request } from '@/app/api.client';

export const youtube = {
  search: async (query: string): Promise<unknown> => {
    return request(`/youtube/search?q=${encodeURIComponent(query)}`);
  },
  checkEmbed: async (videoId: string): Promise<unknown> => {
    return request(`/youtube/check-embed?videoId=${encodeURIComponent(videoId)}`);
  },
};
