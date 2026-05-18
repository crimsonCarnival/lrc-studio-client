import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const OFFLINE_TOAST_ID = 'network-offline';

export function useNetworkStatus() {
  const { t } = useTranslation();
  // Track whether we've gone offline at least once so the first
  // "back online" toast only shows after a prior offline event.
  const wentOffline = useRef(false);

  useEffect(() => {
    function handleOffline() {
      wentOffline.current = true;
      toast.error(t('network.offline'), {
        id: OFFLINE_TOAST_ID,
        duration: Infinity,
      });
    }

    function handleOnline() {
      if (!wentOffline.current) return;
      toast.dismiss(OFFLINE_TOAST_ID);
      toast.success(t('network.online'), { duration: 3000 });
      wentOffline.current = false;
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [t]);
}
