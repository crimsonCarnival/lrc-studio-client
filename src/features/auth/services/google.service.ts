import { request } from '@/app/api.client';
import { getDeviceId } from '@/shared/utils/device';

export const googleService = {
  getAuthUrl: async (): Promise<string> => {
    return `${import.meta.env.VITE_API_URL || '/api'}/google/auth/url?appOrigin=${encodeURIComponent(window.location.origin)}`;
  },

  getLoginUrl: async (loginHint?: string): Promise<string> => {
    const deviceId = await getDeviceId();
    const base = `${import.meta.env.VITE_API_URL || '/api'}/google/login/url?appOrigin=${encodeURIComponent(window.location.origin)}&deviceId=${encodeURIComponent(deviceId)}`;
    return loginHint ? `${base}&loginHint=${encodeURIComponent(loginHint)}` : base;
  },

  disconnect: async (): Promise<unknown> => {
    return request('/google/disconnect', { method: 'POST' });
  },
};
