import { request } from '@/app/api.client';

export const songMetadataService = {
  async lookupTrack(songName: string, artistName = ''): Promise<unknown> {
    const params = new URLSearchParams({ songName });
    if (artistName) params.set('artistName', artistName);
    return request(`/song-metadata/lookup?${params}`);
  },
};
