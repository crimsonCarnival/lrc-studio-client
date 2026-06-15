import { request } from '@/app/api.client.js';

export const songMetadataService = {
  async lookupTrack(songName, artistName = '') {
    const params = new URLSearchParams({ songName });
    if (artistName) params.set('artistName', artistName);
    return request(`/song-metadata/lookup?${params}`);
  },
};
