import { getDeviceId } from '@/shared/utils/device';

export const spotifyApi = {
  getLoginUrl: async () => {
    const deviceId = await getDeviceId();
    const base = `${import.meta.env.VITE_API_URL || '/api'}/spotify/auth/login/url?appOrigin=${encodeURIComponent(window.location.origin)}&deviceId=${encodeURIComponent(deviceId)}`;
    return base;
  },
};
