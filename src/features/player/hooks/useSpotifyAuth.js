import { useCallback } from 'react';
import { spotify as spotifyApi } from '@/app/api';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export const useSpotifyAuth = () => {
  const { t } = useTranslation();

  const login = useCallback(async (onSuccess) => {
    try {
      const { url } = await spotifyApi.getAuthUrl();
      if (!url) return;

      const width = 600;
      const height = 750;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        url, 
        'spotify-auth', 
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
      );

      if (!popup) {
        toast.error(t('spotify.popupBlocked') || 'Popup blocked! Please allow popups for this site.');
        return;
      }

      const handleMessage = (e) => {
        if (e.data?.type === 'spotify-callback') {
          window.removeEventListener('message', handleMessage);
          if (e.data.success) {
            toast.success(t('spotify.connectSuccess') || 'Spotify connected successfully!');
            if (onSuccess) onSuccess();
            else window.location.reload();
          } else {
            toast.error(t('settings.spotify.connectFailed') || 'Failed to connect Spotify');
          }
        }
      };

      window.addEventListener('message', handleMessage);
    } catch (err) {
      console.error('Spotify Auth Error:', err);
      toast.error(t('spotify.connectInitFailed') || 'Failed to initialize Spotify connection');
    }
  }, [t]);

  return { login };
};
