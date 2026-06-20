import { createContext } from 'react';
import type { SettingsContextValue } from './settings.types';

export const SettingsContext = createContext<SettingsContextValue | null>(null);
