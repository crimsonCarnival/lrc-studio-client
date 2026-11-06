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
import i18next from 'i18next';
import { deepMerge, pushSettingsChanges } from './settings-merge';

const STORAGE_KEY = 'lrc-syncer-settings';
// Appearance choices the server has not acknowledged yet. The server copy wins on every sync, so
// without this a theme picked a moment before a reload (or while a sync was in flight) was
// overwritten by the older one the account still had.
const PENDING_KEY = 'lrc-syncer-settings-pending';
const APPEARANCE_KEYS = ['theme', 'customTheme', 'fontWeight'] as const;

function readPending(): Record<string, string> {
  try {
    const raw = JSON.parse(localStorage.getItem(PENDING_KEY) ?? 'null') as Record<string, unknown> | null;
    const out: Record<string, string> = {};
    for (const key of APPEARANCE_KEYS) if (typeof raw?.[key] === 'string') out[key] = raw[key] as string;
    return out;
  } catch { return {}; }
}

function writePending(pending: Record<string, string>): void {
  try {
    if (Object.keys(pending).length > 0) localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    else localStorage.removeItem(PENDING_KEY);
  } catch { /* storage unavailable */ }
}

/** Drops the pending entries the server now holds. */
function clearAcked(serverInterface: Record<string, unknown> | undefined): void {
  const pending = readPending();
  let changed = false;
  for (const key of Object.keys(pending)) {
    if (serverInterface?.[key] === pending[key]) { delete pending[key]; changed = true; }
  }
  if (changed) writePending(pending);
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
  // Last failure already logged, so a retry that fails the same way does not log again.
  const lastWarnedFailureRef = useRef('');
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

  // localStorage write is synchronous and cheap, so it happens immediately on every
  // change — unlike the server push below, it must not be debounced. A debounced write
  // here meant a reload within the debounce window (e.g. toggling the theme then
  // immediately refreshing to "confirm" it) read back the OLD value, since the pending
  // write never got a chance to fire before the page tore down.
  useEffect(() => {
    if (isFirstRender.current) return;
    if (isSyncingRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }, [settings]);

  // Remember appearance changes until the server confirms them (see PENDING_KEY).
  const prevSettingsRef = useRef<any>(settings);
  useEffect(() => {
    const prev = prevSettingsRef.current;
    prevSettingsRef.current = settings;
    // A guest has no server copy to lose to; their pick is carried up at sign-in (syncFromServer).
    if (isSyncingRef.current || prev === settings || !getAccessToken()) return;
    const pending = readPending();
    let changed = false;
    for (const key of APPEARANCE_KEYS) {
      const value = settings.interface?.[key];
      if (prev?.interface?.[key] !== value && typeof value === 'string') { pending[key] = value; changed = true; }
    }
    if (changed) writePending(pending);
  }, [settings]);

  // Debounced server persistence — skips the initial render and skips when changes
  // came from a server fetch (isSyncingRef). Debouncing here is still correct: it's a
  // network call, and rapid successive changes (e.g. dragging a slider) shouldn't each
  // fire their own PATCH.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (isSyncingRef.current) return;
    if (!getAccessToken()) return;

    const timer = setTimeout(() => {
      const changes = computeChangesRef.current?.(lastSavedToServerRef.current, settings) ?? {};

      // Only send if there are actual changes
      if (Object.keys(changes).length > 0) {
        // Changed fields only. A rejected key must not block the rest, so failures keep
        // their old value in the snapshot and are re-sent by the next diff.
        void pushSettingsChanges(changes, settings, lastSavedToServerRef.current, settingsApi.patch).then(({ snapshot, failed }) => {
          lastSavedToServerRef.current = snapshot;
          clearAcked((snapshot as { interface?: Record<string, unknown> } | null)?.interface);
          const failure = failed.join(',');
          if (failure && failure !== lastWarnedFailureRef.current) {
            console.warn('Settings not saved to the server, will retry on the next change:', failed);
          }
          lastWarnedFailureRef.current = failure;
        });
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
      // Server is the source of truth for a logged-in user. Rebase on
      // DEFAULT_SETTINGS (NOT the current local state) so a previous
      // account's leftover localStorage can't bleed into this session.
      // Empty remote = brand-new user (no server doc) = pure defaults.
      const base = structuredClone(DEFAULT_SETTINGS);
      const merged = remote && Object.keys(remote).length > 0
        ? deepMerge(base, remote)
        : base;
      // A theme this browser has but the account never stored (picked as a guest, or the
      // earlier push failed) is the user's choice, not a stale leftover: keep it and send it up,
      // instead of letting the server's silence reset it to the default on every reload.
      const carried: Record<string, string> = {};
      try {
        const localUi = (JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as { interface?: Record<string, unknown> } | null)?.interface;
        const remoteUi = (remote as { interface?: Record<string, unknown> } | null)?.interface;
        for (const key of ['theme', 'customTheme', 'fontWeight']) {
          const local = localUi?.[key];
          if (typeof local === 'string' && local && (remoteUi?.[key] === null || remoteUi?.[key] === undefined)) carried[key] = local;
        }
      } catch { /* unreadable local settings: nothing to carry */ }
      const serverState = structuredClone(merged);
      // Appearance picked here but not yet acknowledged by the server beats the server's older copy.
      const pending = readPending();
      for (const key of Object.keys(pending)) {
        if ((remote as { interface?: Record<string, unknown> } | null)?.interface?.[key] !== pending[key]) carried[key] = pending[key];
      }
      clearAcked((remote as { interface?: Record<string, unknown> } | null)?.interface);
      if (Object.keys(carried).length > 0) merged.interface = { ...merged.interface, ...carried };
      // Persist immediately (save effect is suppressed via isSyncingRef)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
      // Update last saved snapshot since we just synced from server
      lastSavedToServerRef.current = serverState;
      prevSettingsRef.current = merged;
      setSettings(() => merged);
      if (Object.keys(carried).length > 0) {
        // On failure the snapshot still lacks the theme, so the next settings change diffs it and retries.
        void settingsApi.patch({ interface: carried }).then(() => {
          lastSavedToServerRef.current = structuredClone(merged);
          clearAcked(merged.interface);
        }).catch(() => { /* retried by the next diff */ });
      }

      // i18next's detection order is querystring -> localStorage -> navigator,
      // so it never consults the account. Without this, a language chosen on one
      // device is stored on the server and then ignored on every other one.
      // An explicit ?hl= still wins: useThemeSync applies it and we defer here.
      const accountLang = (merged as AppSettings)?.interface?.defaultLanguage;
      const hasHlParam = new URLSearchParams(window.location.search).has('hl');
      if (accountLang && !hasHlParam && i18next.language !== accountLang) {
        void i18next.changeLanguage(accountLang);
      }
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
