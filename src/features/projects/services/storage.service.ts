// All localStorage keys in one auditable place
export const STORAGE_KEYS = {
  PROJECT: 'lrc-syncer-project',
  SHARED_PROJECT: 'lrc-syncer-shared-project',
  ACTIVE_PROJECT_ID: 'lrc-syncer-active-project-id',
  SETTINGS: 'lrc-syncer-settings',
  DEVICE_ID: 'lrc_studio_device_id',
  REMEMBER_ME: 'lrc-studio-remember-me',
  HAS_SESSION: 'lrc-studio-has-session',
  TUTORIAL_SEEN: 'lrc-studio-editor-tutorial-seen',
} as const;

/** Device-level look-and-feel inside the stored settings: it belongs to the browser, not the account. */
const APPEARANCE_KEYS = ['theme', 'customTheme', 'fontWeight'] as const;

/**
 * Drops the stored settings of the signed-out account but keeps the appearance keys, so a
 * logout or an expired session does not send the next page load back to the default theme.
 */
export function clearSettingsKeepAppearance(): void {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) ?? 'null') as { interface?: Record<string, unknown> } | null;
    // The account opted out: signing out returns this browser to the default theme.
    if (stored?.interface?.keepThemeOnSignOut === false) {
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      return;
    }
    const kept: Record<string, unknown> = {};
    for (const key of APPEARANCE_KEYS) {
      const value = stored?.interface?.[key];
      if (typeof value === 'string' && value) kept[key] = value;
    }
    if (Object.keys(kept).length > 0) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ interface: kept }));
    else localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  } catch {
    // Unreadable value: nothing to keep, and leaving it would keep failing to parse.
    try { localStorage.removeItem(STORAGE_KEYS.SETTINGS); } catch { /* storage unavailable */ }
  }
}

// Error-safe wrappers (localStorage can throw in private browsing / storage-full)
export const storage = {
  get: (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } },
  set: (key: string, value: string): void => { try { localStorage.setItem(key, value); } catch { /* ignore */ } },
  remove: (key: string): void => { try { localStorage.removeItem(key); } catch { /* ignore */ } },
  getJSON: <T = unknown>(key: string): T | null => {
    try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
  },
  setJSON: (key: string, value: unknown): void => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};
