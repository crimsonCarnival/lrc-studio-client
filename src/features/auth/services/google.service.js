import { request } from '@/app/api.client.js';

export const googleService = {
  getAuthUrl: async () => {
    const response = await request(`/google/auth/url?appOrigin=${encodeURIComponent(window.location.origin)}`);
    return response.url;
  },

  getLoginUrl: async () => {
    const response = await request(`/google/login/url?appOrigin=${encodeURIComponent(window.location.origin)}`);
    return response.url;
  },

  disconnect: async () => {
    return request('/google/disconnect', { method: 'POST' });
  },
};
