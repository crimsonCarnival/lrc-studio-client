// Shared types for the settings context. The settings object itself is a
// dynamic nested config; sections are listed so typos in section names are
// caught, while leaf values stay loose (settings are user-tunable data).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Section = Record<string, any>;

export interface AppSettings {
  interface?: Section;
  editor?: Section;
  export?: Section;
  playback?: Section;
  shortcuts?: Section;
  advanced?: Section;
  import?: Section;
}

export interface SettingsContextValue {
  settings: AppSettings;
  updateSetting: (path: string, value: unknown) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  updateAllSettings: (settings: AppSettings) => void;
  resetSettings: () => void;
  syncFromServer: () => void;
}
