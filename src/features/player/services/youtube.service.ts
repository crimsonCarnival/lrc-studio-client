import { request } from '@/app/api.client';

/** Mirrors the server's reason codes (server/src/modules/youtube/youtube.service.ts). */
export type YoutubeAvailability =
  | 'available'
  | 'not_found'
  | 'private'
  | 'embed_disabled'
  | 'age_restricted'
  | 'region_blocked'
  | 'restricted';

export const youtube = {
  // Throws ApiError: 400 (code `invalid_id`) for a malformed id, 502 (code `check_failed`) when YouTube couldn't be reached.
  checkAvailability: async (videoId: string): Promise<{ status: YoutubeAvailability } | null> => {
    return request<{ status: YoutubeAvailability }>(`/youtube/availability?videoId=${encodeURIComponent(videoId)}`);
  },
  search: async (query: string): Promise<unknown> => {
    return request(`/youtube/search?q=${encodeURIComponent(query)}`);
  },
};
