import { SettingsProvider } from '@/features/settings/SettingsContext';
import { SetupProvider } from '@/features/editor/SetupContext';
import { TooltipProvider } from '@ui/tooltip';
import { NotificationsProvider } from '@/features/notifications/NotificationsContext';

export function AppProviders({ children }) {
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
