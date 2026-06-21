import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { SettingsProvider } from '@/features/settings/SettingsContext';
import { SetupProvider } from '@/features/editor/SetupContext';
import { TooltipProvider } from '@ui/tooltip';
import { NotificationsProvider } from '@/features/notifications/NotificationsContext';
import { connectSocket, disconnectSocket } from '@/app/socket.client';
import { useSessionSocket } from '@/features/auth/hooks/useSessionSocket';
import SetAccountNameModal from '@/features/auth/components/SetAccountNameModal';

import { BadgeDefsProvider } from '@/features/badges/BadgeDefsContext';

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    connectSocket();

    // A socket dropped while the tab was backgrounded (ping timeout) or while
    // offline won't always self-heal — browsers suspend timers/sockets in the
    // background. Re-assert the connection when the user returns or the network
    // recovers. connectSocket() is idempotent: it reuses a live socket and only
    // re-establishes a stale one.
    const resume = () => {
      if (document.visibilityState === 'visible') connectSocket();
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);

    return () => {
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
      disconnectSocket();
    };
  }, []);

  useSessionSocket();

  return (
    <SettingsProvider>
      <SetupProvider>
        <TooltipProvider>
          <NotificationsProvider>
            <BadgeDefsProvider>
              <SetAccountNameModal />
              {children}
            </BadgeDefsProvider>
          </NotificationsProvider>
        </TooltipProvider>
      </SetupProvider>
    </SettingsProvider>
  );
}
