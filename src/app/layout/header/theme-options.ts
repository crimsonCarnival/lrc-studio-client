// Shared by the standalone ThemeLangSwitcher (guests) and the in-menu picker
// in UserMenu (#14), so the theme list stays a single source of truth.
export const THEMES = [
  { id: 'system', label: 'System', iconName: 'desktop_windows', swatch: 'bg-zinc-500' },
  { id: 'dark', label: 'Dark', iconName: 'dark_mode', swatch: 'bg-[#232136] border border-[#393552]' },
  { id: 'light', label: 'Light', iconName: 'light_mode', swatch: 'bg-[#faf4ed] border border-[#dfdad9]' },
  { id: 'cobalt', label: 'Cobalt', iconName: 'palette', swatch: 'bg-[#2F2FE4]' },
  { id: 'velvet', label: 'Velvet', iconName: 'palette', swatch: 'bg-[#A64D79]' },
  { id: 'sage', label: 'Sage', iconName: 'palette', swatch: 'bg-[#5C8374]' },
];
