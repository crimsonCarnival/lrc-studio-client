// All localStorage keys in one auditable place
export const STORAGE_KEYS = {
  PROJECT: 'lrc-syncer-project',
  SHARED_PROJECT: 'lrc-syncer-shared-project',
  ACTIVE_PROJECT_ID: 'lrc-syncer-active-project-id',
  SETTINGS: 'lrc-syncer-settings',
  DEVICE_ID: 'lrc_studio_device_id',
  CLONE_AFTER_AUTH: 'cloneAfterAuth',
  REDIRECT: 'lrc-syncer-redirect',
  REMEMBER_ME: 'lrc-studio-remember-me',
  HAS_SESSION: 'lrc-studio-has-session',
};

// Error-safe wrappers (localStorage can throw in private browsing / storage-full)
export const storage = {
  get: (key) => { try { return localStorage.getItem(key); } catch { return null; } },
  set: (key, value) => { try { localStorage.setItem(key, value); } catch { /* ignore */ } },
  remove: (key) => { try { localStorage.removeItem(key); } catch { /* ignore */ } },
  getJSON: (key) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
  },
  setJSON: (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};
