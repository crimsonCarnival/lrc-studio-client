import { describe, it, expect, beforeEach } from 'vitest';
import { STORAGE_KEYS, clearSettingsKeepAppearance } from './storage.service';

const read = () => JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) ?? 'null');

describe('clearSettingsKeepAppearance', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the theme and drops everything else', () => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
      interface: { theme: 'light', customTheme: '{"a":1}', fontWeight: 'bold', defaultLanguage: 'es' },
      playback: { volume: 0.2 },
    }));
    clearSettingsKeepAppearance();
    expect(read()).toEqual({ interface: { theme: 'light', customTheme: '{"a":1}', fontWeight: 'bold' } });
  });

  it('keeps nothing when the account turned keepThemeOnSignOut off', () => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ interface: { theme: 'light', keepThemeOnSignOut: false } }));
    clearSettingsKeepAppearance();
    expect(localStorage.getItem(STORAGE_KEYS.SETTINGS)).toBeNull();
  });

  it('removes the key when there is no appearance to keep, or it is unreadable', () => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ playback: { volume: 0.2 } }));
    clearSettingsKeepAppearance();
    expect(localStorage.getItem(STORAGE_KEYS.SETTINGS)).toBeNull();
    localStorage.setItem(STORAGE_KEYS.SETTINGS, '{not json');
    clearSettingsKeepAppearance();
    expect(localStorage.getItem(STORAGE_KEYS.SETTINGS)).toBeNull();
  });
});
