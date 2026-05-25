import { request } from '@/app/api.client.js';

export const googleService = {
  getAuthUrl: async () => {
    return `${import.meta.env.VITE_API_URL || '/api'}/google/auth/url?appOrigin=${encodeURIComponent(window.location.origin)}`;
  },

  getLoginUrl: async () => {
    return `${import.meta.env.VITE_API_URL || '/api'}/google/login/url?appOrigin=${encodeURIComponent(window.location.origin)}`;
  },

  disconnect: async () => {
    return request('/google/disconnect', { method: 'POST' });
  },
};
