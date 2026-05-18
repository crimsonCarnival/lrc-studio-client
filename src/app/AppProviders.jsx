import { SettingsProvider } from '@/features/settings/SettingsContext';
import { SetupProvider } from '@/features/editor/SetupContext';
import { TooltipProvider } from '@ui/tooltip';

export function AppProviders({ children }) {
  return (
    <SettingsProvider>
      <SetupProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </SetupProvider>
    </SettingsProvider>
  );
}
