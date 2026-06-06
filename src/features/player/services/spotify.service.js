import { request } from '@/app/api.client.js';
import { getDeviceId } from '@/shared/utils/device';

export const spotifyService = {
  async resolve(url) {
    return request('/spotify/resolve', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },

  async getAuthUrl() {
    return `${import.meta.env.VITE_API_URL || '/api'}/spotify/auth/url`;
  },

  async getLoginUrl() {
    const deviceId = await getDeviceId();
    const base = `${import.meta.env.VITE_API_URL || '/api'}/spotify/auth/login/url`;
    const params = new URLSearchParams({ appOrigin: window.location.origin, deviceId });
    return `${base}?${params}`;
  },

  async getToken() {
    return request('/spotify/token');
  },

  async disconnect() {
    return request('/spotify/disconnect', { method: 'POST' });
  },

  async createUpload(url) {
    return request('/spotify/upload', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },

  // ——— Metadata lookup (public, no auth required) ———
  async lookupTrack(songName, artistName = '') {
    const params = new URLSearchParams({ songName });
    if (artistName) params.set('artistName', artistName);
    return request(`/spotify/lookup?${params}`);
  },

  // ——— Search ———
  async search(q, { limit = 5, offset = 0 } = {}) {
    const params = new URLSearchParams({ q, limit: String(limit), offset: String(offset) });
    return request(`/spotify/search?${params}`);
  },

  // ——— Library browsing ———
  async getSavedTracks({ limit = 20, offset = 0 } = {}) {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    return request(`/spotify/saved-tracks?${params}`);
  },

  async getRecentlyPlayed({ limit = 20 } = {}) {
    const params = new URLSearchParams({ limit: String(limit) });
    return request(`/spotify/recently-played?${params}`);
  },

  async getTopTracks({ timeRange = 'medium_term', limit = 20, offset = 0 } = {}) {
    const params = new URLSearchParams({ time_range: timeRange, limit: String(limit), offset: String(offset) });
    return request(`/spotify/top-tracks?${params}`);
  },

  // ——— Library save/remove/check ———
  async saveToLibrary(uris) {
    return request('/spotify/library', {
      method: 'PUT',
      body: JSON.stringify({ uris }),
    });
  },

  async removeFromLibrary(uris) {
    return request('/spotify/library', {
      method: 'DELETE',
      body: JSON.stringify({ uris }),
    });
  },

  async checkLibrary(uris) {
    const params = new URLSearchParams({ uris: uris.join(',') });
    return request(`/spotify/library/contains?${params}`);
  },

  // ——— Playlists ———
  async getPlaylists({ limit = 20, offset = 0 } = {}) {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    return request(`/spotify/playlists?${params}`);
  },

  async getPlaylistTracks(playlistId, { limit = 20, offset = 0 } = {}) {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    return request(`/spotify/playlists/${encodeURIComponent(playlistId)}/tracks?${params}`);
  },

  async createPlaylist(name, description = '', isPublic = false) {
    return request('/spotify/playlists', {
      method: 'POST',
      body: JSON.stringify({ name, description, public: isPublic }),
    });
  },

  async addToPlaylist(playlistId, uris) {
    return request(`/spotify/playlists/${encodeURIComponent(playlistId)}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ uris }),
    });
  },

  // ——— Player / Devices ———
  async getDevices() {
    return request('/spotify/devices');
  },

  async transferPlayback(deviceId, play = false) {
    return request('/spotify/player/transfer', {
      method: 'PUT',
      body: JSON.stringify({ deviceId, play }),
    });
  },

  async getPlaybackState() {
    return request('/spotify/player');
  },

  async getCurrentlyPlaying() {
    return request('/spotify/player/currently-playing');
  },

  async addToQueue(uri, deviceId) {
    return request('/spotify/player/queue', {
      method: 'POST',
      body: JSON.stringify({ uri, deviceId }),
    });
  },

  async getQueue() {
    return request('/spotify/player/queue');
  },
};
