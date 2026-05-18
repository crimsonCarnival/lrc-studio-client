import { request } from '@/app/api.client.js';

export const googleService = {
  getAuthUrl: async () => {
    const response = await request('/google/auth/url');
    return response.url;
  },

  getLoginUrl: async () => {
    const response = await request('/google/login/url');
    return response.url;
  },

  disconnect: async () => {
    return request('/google/disconnect', { method: 'POST' });
  },
};
