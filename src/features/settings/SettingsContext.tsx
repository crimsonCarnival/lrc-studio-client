/* eslint-disable @typescript-eslint/no-explicit-any */
// This module is a dynamic settings store: it deep-merges, deep-diffs and walks
// arbitrary key paths, so the internal helpers are intentionally `any`-typed.
// The public context surface is strongly typed via SettingsContextValue.
import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_SETTINGS } from './settings-defaults';
import { SettingsContext } from './settings-context-value';
import { settings as settingsApi, getAccessToken } from '@/app/api';
import type { AppSettings, SettingsContextValue } from './settings.types';

const STORAGE_KEY = 'lrc-syncer-settings';

function deepMerge(target: any, source: any): any {
  if (typeof target !== 'object' || target === null) return source;
  if (typeof source !== 'object' || source === null) return target;

  const output = { ...target };
  Object.keys(source).forEach(key => {
    if (source[key] instanceof Array) {
      output[key] = source[key]; // Arrays overwrite
    } else if (typeof source[key] === 'object' && source[key] !== null) {
      output[key] = deepMerge(target[key], source[key]);
    } else {
      output[key] = source[key];
    }
  });
  return output;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return deepMerge(DEFAULT_SETTINGS, JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
    return structuredClone(DEFAULT_SETTINGS);
  });

  // Track the last version saved to server to compute diffs
  const lastSavedToServerRef = useRef<any>(null);
  const isSyncingRef = useRef(false);
  const isFirstRender = useRef(true);
  const computeChangesRef = useRef<((original: any, current: any) => any) | null>(null);

  // Compute deep diff between two objects, returning only changed paths
  const computeChanges = useCallback((original: any, current: any) => {
    if (!original) return current;

    const changes: any = {};

    const findDiffs = (origObj: any, currObj: any, path: string[] = []) => {
      if (typeof currObj !== 'object' || currObj === null) {
        if (origObj !== currObj) {
          // Leaf value changed
          let target = changes;
          for (let i = 0; i < path.length - 1; i++) {
            if (!target[path[i]]) target[path[i]] = {};
            target = target[path[i]];
          }
          target[path[path.length - 1]] = currObj;
        }
        return;
      }

      // Handle arrays - send full array if changed
      if (Array.isArray(currObj)) {
        if (JSON.stringify(origObj) !== JSON.stringify(currObj)) {
          let target = changes;
          for (let i = 0; i < path.length - 1; i++) {
            if (!target[path[i]]) target[path[i]] = {};
            target = target[path[i]];
          }
          target[path[path.length - 1]] = currObj;
        }
        return;
      }

      // Handle objects recursively
      const allKeys = new Set([...Object.keys(origObj || {}), ...Object.keys(currObj)]);
      for (const key of allKeys) {
        findDiffs(origObj?.[key], currObj[key], [...path, key]);
      }
    };

    findDiffs(original, current, []);
    return changes;
  }, []);
  useLayoutEffect(() => { computeChangesRef.current = computeChanges; }, [computeChanges]);

  // Debounced localStorage + server persistence — skips the initial render
  // and skips when changes came from a server fetch (isSyncingRef).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (isSyncingRef.current) return;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (e) {
        console.error('Failed to save settings', e);
      }

      // Push to server if authenticated (only changed fields)
      if (getAccessToken()) {
        const changes = computeChangesRef.current?.(lastSavedToServerRef.current, settings) ?? {};

        // Only send if there are actual changes
        if (Object.keys(changes).length > 0) {
          // Use PATCH for partial updates (changed fields only)
          settingsApi.patch(changes).then(() => {
            // Update the last saved snapshot on success
            lastSavedToServerRef.current = structuredClone(settings);
          }).catch(() => {
            // Silently fail — localStorage is the source of truth
          });
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [settings]);

  const updateSetting = useCallback((keyPath: string, value: unknown) => {
    setSettings((prev: any) => {
      const keys = keyPath.split('.');
      const next = { ...prev };
      let cursor = next;
      for (let i = 0; i < keys.length - 1; i++) {
        cursor[keys[i]] = { ...cursor[keys[i]] };
        cursor = cursor[keys[i]];
      }
      cursor[keys[keys.length - 1]] = value;
      return next;
    });
  }, []);

  const updateSettings = useCallback((updates: Record<string, unknown>) => {
    setSettings((prev: any) => {
      const next = { ...prev };
      for (const [keyPath, value] of Object.entries(updates)) {
        const keys = keyPath.split('.');
        let cursor = next;
        // We need to ensure each branch is cloned
        for (let i = 0; i < keys.length - 1; i++) {
          cursor[keys[i]] = { ...cursor[keys[i]] };
          cursor = cursor[keys[i]];
        }
        cursor[keys[keys.length - 1]] = value;
      }
      return next;
    });
  }, []);

  const updateAllSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(structuredClone(DEFAULT_SETTINGS));
  }, []);

  // Call after login or on mount to pull server settings (single entry point).
  // Uses isSyncingRef to prevent the save effect from writing back unchanged data.
  const syncInFlightRef = useRef(false);
  const syncFromServer = useCallback(() => {
    if (!getAccessToken() || syncInFlightRef.current) return;
    syncInFlightRef.current = true;

    settingsApi.get().then((remote: any) => {
      isSyncingRef.current = true;
      setSettings(() => {
        // Server is the source of truth for a logged-in user. Rebase on
        // DEFAULT_SETTINGS (NOT the current local state) so a previous
        // account's leftover localStorage can't bleed into this session.
        // Empty remote = brand-new user (no server doc) = pure defaults.
        const base = structuredClone(DEFAULT_SETTINGS);
        const merged = remote && Object.keys(remote).length > 0
          ? deepMerge(base, remote)
          : base;
        // Persist immediately (save effect is suppressed via isSyncingRef)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
        // Update last saved snapshot since we just synced from server
        lastSavedToServerRef.current = structuredClone(merged);
        return merged;
      });
      // Clear the sync flag after React processes the state update
      queueMicrotask(() => { isSyncingRef.current = false; });
    }).catch(() => { /* ignore */ }).finally(() => {
      syncInFlightRef.current = false;
    });
  }, []);

  const contextValue = useMemo<SettingsContextValue>(
    () => ({ settings, updateSetting, updateSettings, updateAllSettings, resetSettings, syncFromServer }),
    [settings, updateSetting, updateSettings, updateAllSettings, resetSettings, syncFromServer]
  );

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}
