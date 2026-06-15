import { request } from '@/app/api.client.js';

export const spotifyService = {
  async resolve(url) {
    return request('/spotify/resolve', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },

  async createUpload(url) {
    return request('/spotify/upload', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },

  async lookupTrack(songName, artistName = '') {
    const params = new URLSearchParams({ songName });
    if (artistName) params.set('artistName', artistName);
    return request(`/spotify/lookup?${params}`);
  },
};
