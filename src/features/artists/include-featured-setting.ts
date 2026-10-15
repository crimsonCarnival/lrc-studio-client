import { useSyncExternalStore } from 'react';

/**
 * "Include featured artists in the title ([ti:])" for LRC export. Off by default, so `[ti:]` stays
 * the plain title and `[ar:]` alone lists every artist.
 *
 * Kept in this browser (localStorage) for now: the server's user settings do not have the field yet
 * (see docs/server-export-artist-setting.md). Once they do, read and write `settings.export` here
 * instead; every caller goes through this module.
 */
const KEY = 'lrc:export:includeFeaturedInTitle';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setIncludeFeaturedInTitle(value: boolean): void {
  try {
    localStorage.setItem(KEY, value ? '1' : '0');
  } catch { /* private mode: the choice lasts until reload */ }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

export function useIncludeFeaturedInTitle(): readonly [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(subscribe, read, () => false);
  return [value, setIncludeFeaturedInTitle] as const;
}

/** Non-hook read, for code outside React (the download buttons). */
export const getIncludeFeaturedInTitle = read;
