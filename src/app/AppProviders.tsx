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

  // On touch devices a long press opens our own context menus, but the browser
  // fires its native `contextmenu` for the same gesture, so both appeared at
  // once. Radix only prevents the event on its triggers, which leaves every
  // gap, padding and background showing the browser menu instead.
  //
  // Suppressed for coarse pointers only: on desktop the native menu is expected
  // (back, reload, inspect), and text fields keep it everywhere so copy and
  // paste still work while editing lyrics.
  useEffect(() => {
    if (!window.matchMedia?.('(pointer: coarse)').matches) return;
    const suppress = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      e.preventDefault();
    };
    document.addEventListener('contextmenu', suppress);
    return () => document.removeEventListener('contextmenu', suppress);
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
