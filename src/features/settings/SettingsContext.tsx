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

function upgradeLegacySettings(parsed: any): any {
  // If we already have the nested 'playback' object, it's likely migrated.
  if (parsed.playback && typeof parsed.playback === 'object') {
    return parsed;
  }

  // Create a base config using defaults
  const migrated = structuredClone(DEFAULT_SETTINGS);

  // Playback
  if (parsed.defaultVolume !== undefined) migrated.playback.volume = parsed.defaultVolume;
  if (parsed.volume !== undefined) migrated.playback.volume = parsed.volume;
  if (parsed.muted !== undefined) migrated.playback.muted = parsed.muted;
  if (parsed.autoRewindOnPause !== undefined) {
    migrated.playback.autoRewindOnPause = { enabled: parsed.autoRewindOnPause > 0, seconds: parsed.autoRewindOnPause };
  }
  if (parsed.minSpeed !== undefined) migrated.playback.speedBounds.min = parsed.minSpeed;
  if (parsed.maxSpeed !== undefined) migrated.playback.speedBounds.max = parsed.maxSpeed;
  if (parsed.showWaveform !== undefined) migrated.playback.showWaveform = parsed.showWaveform;

  // Editor
  if (parsed.autoPauseOnMark !== undefined) migrated.editor.autoPauseOnMark = parsed.autoPauseOnMark;
  if (parsed.nudgeIncrement !== undefined) {
    migrated.editor.nudge.default = parsed.nudgeIncrement;
    migrated.editor.nudge.coarse = parsed.nudgeIncrement;
  }
  if (parsed.autoAdvance !== undefined) migrated.editor.autoAdvance.enabled = parsed.autoAdvance;
  if (parsed.skipBlankLines !== undefined) migrated.editor.autoAdvance.skipBlank = parsed.skipBlankLines;
  if (parsed.showShiftAll !== undefined) migrated.editor.showShiftAll = parsed.showShiftAll;
  if (parsed.editorTimestampPrecision !== undefined) migrated.editor.timestampPrecision = parsed.editorTimestampPrecision;
  if (parsed.activeLineHighlight !== undefined) migrated.editor.display.activeHighlight = parsed.activeLineHighlight;
  if (parsed.scrollBehavior !== undefined) migrated.editor.scroll.mode = parsed.scrollBehavior;
  if (parsed.scrollBlock !== undefined) migrated.editor.scroll.alignment = parsed.scrollBlock;

  // Export
  if (parsed.lineEndings !== undefined) migrated.export.lineEndings = parsed.lineEndings;
  if (parsed.copyFormat !== undefined) migrated.export.copyFormat = parsed.copyFormat;
  if (parsed.downloadFormat !== undefined) migrated.export.downloadFormat = parsed.downloadFormat;
  // export.timestampPrecision was removed; migrate to editor.timestampPrecision
  if (parsed.timestampPrecision !== undefined && migrated.editor.timestampPrecision === undefined) {
    migrated.editor.timestampPrecision = parsed.timestampPrecision;
  }
  if (parsed.defaultFilenamePattern !== undefined) migrated.export.defaultFilenamePattern = parsed.defaultFilenamePattern;

  // Interface
  if (parsed.theme !== undefined) migrated.interface.theme = parsed.theme;
  if (parsed.defaultLanguage !== undefined) {
    const lang = parsed.defaultLanguage === 'jp' ? 'ja' : parsed.defaultLanguage;
    migrated.interface.defaultLanguage = ['en', 'es'].includes(lang) ? lang : 'en';
  }
  if (parsed.fontSize !== undefined) migrated.interface.fontSize = parsed.fontSize;
  if (parsed.spacing !== undefined) migrated.interface.spacing = parsed.spacing;
  if (parsed.previewAlignment !== undefined) migrated.interface.previewAlignment = parsed.previewAlignment;

  // Shortcuts
  if (parsed.shortcutMark) migrated.shortcuts.mark = [parsed.shortcutMark];
  if (parsed.shortcutNudgeLeft) migrated.shortcuts.nudgeLeft = [parsed.shortcutNudgeLeft];
  if (parsed.shortcutNudgeRight) migrated.shortcuts.nudgeRight = [parsed.shortcutNudgeRight];
  if (parsed.shortcutAddLine) migrated.shortcuts.addLine = [parsed.shortcutAddLine];
  if (parsed.shortcutDeleteLine) migrated.shortcuts.deleteLine = [parsed.shortcutDeleteLine];
  if (parsed.shortcutClearTimestamp) migrated.shortcuts.clearTimestamp = [parsed.shortcutClearTimestamp];
  if (parsed.shortcutSwitchMode) migrated.shortcuts.switchMode = [parsed.shortcutSwitchMode];

  // Advanced
  if (parsed.autoSaveEnabled !== undefined) migrated.advanced.autoSave.enabled = parsed.autoSaveEnabled;
  if (parsed.autoSaveInterval !== undefined) migrated.advanced.autoSave.timeInterval = parsed.autoSaveInterval;
  if (parsed.confirmDestructive !== undefined) migrated.advanced.confirmDestructive = parsed.confirmDestructive;

  return migrated;
}

// Migrate stored shortcut defaults that changed across versions.
// Only rewrites values that exactly match the old default — custom bindings are preserved.
const SHORTCUT_RENAMES = [
  { key: 'nudgeLeft', from: 'ArrowLeft', to: 'Alt+ArrowLeft' },
  { key: 'nudgeRight', from: 'ArrowRight', to: 'Alt+ArrowRight' },
  { key: 'seekBackward', from: 'Alt+ArrowLeft', to: 'ArrowLeft' },
  { key: 'seekForward', from: 'Alt+ArrowRight', to: 'ArrowRight' },
];

function migrateExportTimestampPrecision(settings: any): any {
  if (settings.export?.timestampPrecision === undefined) return settings;
  // Move export.timestampPrecision → editor.timestampPrecision if editor one is unset
  const editorPrecision = settings.editor?.timestampPrecision;
  const exportPrecision = settings.export.timestampPrecision;
  const newExport = { ...settings.export };
  delete newExport.timestampPrecision;
  return {
    ...settings,
    editor: { ...settings.editor, timestampPrecision: editorPrecision ?? exportPrecision },
    export: newExport,
  };
}

function migrateShortcutDefaults(settings: any): any {
  let changed = false;
  const shortcuts = { ...settings.shortcuts };
  for (const { key, from, to } of SHORTCUT_RENAMES) {
    if (shortcuts[key]?.[0] === from) {
      shortcuts[key] = [to];
      changed = true;
    }
  }
  return changed ? { ...settings, shortcuts } : settings;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const migrated = upgradeLegacySettings(parsed);
        return migrateExportTimestampPrecision(migrateShortcutDefaults(deepMerge(DEFAULT_SETTINGS, migrated)));
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
