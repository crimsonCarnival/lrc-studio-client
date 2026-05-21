import { use } from 'react';
import { SettingsContext } from './settings-context-value.js';

export function useSettings() {
  const ctx = use(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
