import { SettingsProvider } from '../contexts/SettingsContext';
import { SetupProvider } from '../contexts/SetupContext';
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
