import { Sun, Moon, Monitor, Palette } from 'lucide-react';

// Shared by the standalone ThemeLangSwitcher (guests) and the in-menu picker
// in UserMenu (#14), so the theme list stays a single source of truth.
export const THEMES = [
  { id: 'system', label: 'System', Icon: Monitor, swatch: 'bg-zinc-500' },
  { id: 'dark', label: 'Dark', Icon: Moon, swatch: 'bg-[#232136] border border-[#393552]' },
  { id: 'light', label: 'Light', Icon: Sun, swatch: 'bg-[#faf4ed] border border-[#dfdad9]' },
  { id: 'cobalt', label: 'Cobalt', Icon: Palette, swatch: 'bg-[#2F2FE4]' },
  { id: 'velvet', label: 'Velvet', Icon: Palette, swatch: 'bg-[#A64D79]' },
  { id: 'sage', label: 'Sage', Icon: Palette, swatch: 'bg-[#5C8374]' },
];
