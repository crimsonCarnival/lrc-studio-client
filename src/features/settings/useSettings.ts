import { use } from 'react';
import { SettingsContext } from './settings-context-value.js';
import type { SettingsContextValue } from './settings.types';

export function useSettings(): SettingsContextValue {
  const ctx = use(SettingsContext) as SettingsContextValue | null;
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
