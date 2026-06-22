// Shared types for the settings context. The settings object itself is a
// dynamic nested config; sections are listed so typos in section names are
// caught, while leaf values stay loose (settings are user-tunable data).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Section = Record<string, any>;

// Sections are always present at runtime — the provider seeds state from
// DEFAULT_SETTINGS and deep-merges server/localStorage onto it, so every
// section exists. Typed as required to avoid spurious "possibly undefined".
export interface AppSettings {
  interface: Section;
  editor: Section;
  export: Section;
  playback: Section;
  shortcuts: Section;
  advanced: Section;
  import: Section;
}

export interface SettingsContextValue {
  settings: AppSettings;
  updateSetting: (path: string, value: unknown) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  updateAllSettings: (settings: AppSettings) => void;
  resetSettings: () => void;
  syncFromServer: () => void;
}
