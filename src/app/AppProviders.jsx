import { useEffect } from 'react';
import { SettingsProvider } from '@/features/settings/SettingsContext';
import { SetupProvider } from '@/features/editor/SetupContext';
import { TooltipProvider } from '@ui/tooltip';
import { NotificationsProvider } from '@/features/notifications/NotificationsContext';
import { connectSocket, disconnectSocket } from '@/app/socket.client';
import { useSessionSocket } from '@/features/auth/hooks/useSessionSocket';

export function AppProviders({ children }) {
  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, []);

  useSessionSocket();

  return (
    <SettingsProvider>
      <SetupProvider>
        <TooltipProvider>
          <NotificationsProvider>
            {children}
          </NotificationsProvider>
        </TooltipProvider>
      </SetupProvider>
    </SettingsProvider>
  );
}
