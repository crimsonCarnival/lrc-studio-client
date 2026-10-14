/**
 * LRC Studio's own icon set (redesign sheet 03): one geometry on a 24px grid, drawn as
 * strokes. Keys are the Material Symbols names the app already passes to <Icon>, so an
 * icon moves from the font to this set by gaining an entry here; anything without an
 * entry still renders from the font.
 */
export type IconShape = {
  d: string;
  /** Always a solid shape, never an outline (play). */
  solid?: boolean;
  /** A single closed outline, so <Icon filled> can fill it. Open drawings ignore `filled`. */
  fillable?: boolean;
  /** Stroke weight relative to the set's default, for glyphs made of very few strokes. */
  weight?: number;
  /** Degrees to rotate the drawing, for icons that are another one turned. */
  rotate?: number;
};

const EXPAND = 'M6 9.5l6 6 6-6';
const BACK = 'M19 12H5 M11 6l-6 6 6 6';
const ADMIN = 'M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5c-4.3-1.5-7.5-5-7.5-9.5V6z M9 12l2 2 4-4';
const SETTINGS = 'M4 7h9 M17 7h3 M4 17h3 M11 17h9 M15 5v4 M9 15v4';
const LIBRARY = 'M5 4v16 M9.5 4v16 M14 5l4.5 15';
const LOCATE = 'M19 12a7 7 0 1 1-14 0a7 7 0 1 1 14 0 M13.5 12a1.5 1.5 0 1 1-3 0a1.5 1.5 0 1 1 3 0 M12 2v3 M12 19v3 M2 12h3 M19 12h3';
const PASSKEY = 'M7 10a5 5 0 0 1 10 0v2 M12 10v4c0 2.5-1 4.5-2.5 6 M9.5 10.5c0 4-.5 6-2 8 M14.5 12.5c0 3-.4 5-1.5 7 M4.5 14c.3-1.5.5-2.5.5-4a7 7 0 0 1 13-3.6';

export const ICON_SHAPES: Record<string, IconShape> = {
  // Transport and editing
  play_arrow: { d: 'M8.5 5.8v12.4a.6.6 0 0 0 .9.5l9.6-6.2a.6.6 0 0 0 0-1L9.4 5.3a.6.6 0 0 0-.9.5z', solid: true },
  pause: { d: 'M9 6v12 M15 6v12', weight: 1.3 },
  repeat: { d: 'M17 3l3 3-3 3 M4 11V9a3 3 0 0 1 3-3h13 M7 21l-3-3 3-3 M20 13v2a3 3 0 0 1-3 3H4' },
  undo: { d: 'M9 14L4 9l5-5 M4 9h10.5a5.5 5.5 0 0 1 0 11H11' },
  redo: { d: 'M15 14l5-5-5-5 M20 9H9.5a5.5 5.5 0 0 0 0 11H13' },
  save: { d: 'M6 4h10l3 3v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1z M8.5 4v4h6V4 M8.5 20v-5h7v5' },
  download: { d: 'M12 4v11 M7.5 10.5L12 15l4.5-4.5 M5 19h14' },
  upload: { d: 'M12 15V4 M7.5 8.5L12 4l4.5 4.5 M5 19h14' },
  visibility: { d: 'M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z M15 12a3 3 0 1 1-6 0a3 3 0 1 1 6 0' },
  close: { d: 'M6 6l12 12 M18 6L6 18' },
  check: { d: 'M5 12.5l4.5 4.5L19 7' },
  delete: { d: 'M4 7h16 M9 7V4.5h6V7 M6.5 7l1 13h9l1-13 M10 11v5 M14 11v5' },
  edit: { d: 'M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4' },
  add: { d: 'M12 5v14 M5 12h14' },
  // Not on the sheet: the horizontal stroke of dd, so the -/+ pair matches.
  remove: { d: 'M5 12h14' },

  // Lyrics and sync
  subject: { d: 'M4 6h16 M4 12h16 M4 18h10' },
  view_week: { d: 'M3 9.5A1.5 1.5 0 0 1 4.5 8h3A1.5 1.5 0 0 1 9 9.5v5A1.5 1.5 0 0 1 7.5 16h-3A1.5 1.5 0 0 1 3 14.5z M11 9.5A1.5 1.5 0 0 1 12.5 8h7A1.5 1.5 0 0 1 21 9.5v5a1.5 1.5 0 0 1-1.5 1.5h-7a1.5 1.5 0 0 1-1.5-1.5z' },
  checklist: { d: 'M4 6h10 M4 12h7 M4 18h5 M13 17l3 3 5-6' },
  keyboard_return: { d: 'M19 5v6a3 3 0 0 1-3 3H6 M9.5 10.5L6 14l3.5 3.5' },
  my_location: { d: LOCATE },
  equalizer: { d: 'M3 12h1 M7 9v6 M11 5v14 M15 8v8 M19 11v2' },
  graphic_eq: { d: 'M3 12h1 M7 9v6 M11 5v14 M15 8v8 M19 11v2' },
  horizontal_distribute: { d: 'M4 12h16 M4 8v8 M9.3 9.5v5 M14.7 9.5v5 M20 8v8' },
  auto_fix_high: { d: 'M4 20L14 10 M12.5 8.5l3 3 M18 3v3 M16.5 4.5h3 M20 10v2 M19 11h2 M9 4v2 M8 5h2' },
  music_note: { d: 'M9 18V6l10-2v12 M9 18a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0 M19 16a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0' },
  description: { d: 'M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20z M14 3.5V8h4 M9 12h6 M9 16h4' },
  smart_display: { d: 'M3.5 8.5a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3z M10.5 9.5v5l4-2.5z' },
  cloud: { d: 'M7 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5a4.5 4.5 0 0 1-.5 9z', fillable: true },

  // Social
  star: { d: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z', fillable: true },
  call_split: { d: 'M7 6a2 2 0 1 1-4 0a2 2 0 1 1 4 0 M21 6a2 2 0 1 1-4 0a2 2 0 1 1 4 0 M14 19a2 2 0 1 1-4 0a2 2 0 1 1 4 0 M5 8v1.5a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8 M12 12.5V17' },
  share: { d: 'M20 7.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0 M20 16.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0 M9 12a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0 M8.8 10.8l6.4-2.8 M8.8 13.2l6.4 2.8' },
  link: { d: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1' },
  open_in_new: { d: 'M13 4h7v7 M20 4l-9 9 M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10' },
  person_add: { d: 'M14 8a4 4 0 1 1-8 0a4 4 0 1 1 8 0 M3 20a7 7 0 0 1 11-5.7 M19 14v6 M16 17h6' },

  // Navigation
  arrow_back: { d: BACK },
  arrow_forward: { d: BACK, rotate: 180 },
  expand_more: { d: EXPAND },
  expand_less: { d: EXPAND, rotate: 180 },
  chevron_right: { d: EXPAND, rotate: -90 },
  chevron_left: { d: EXPAND, rotate: 90 },
  search: { d: 'M17 11a6 6 0 1 1-12 0a6 6 0 1 1 12 0 M15.5 15.5L20 20' },
  sort: { d: 'M4 7h16 M7 12h10 M10 17h4' },
  tune: { d: SETTINGS },
  settings: { d: SETTINGS },
  notifications: { d: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z M10 20.5a2 2 0 0 0 4 0' },
  security: { d: ADMIN },
  admin_panel_settings: { d: ADMIN },
  menu_book: { d: LIBRARY },
  library_music: { d: LIBRARY },
  language: { d: 'M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0 M3 12h18 M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9 M12 3c-2.5 2.5-3.5 5.5-3.5 9s1 6.5 3.5 9' },

  // Account and progress
  fingerprint: { d: PASSKEY },
  emoji_events: { d: 'M8 4h8v5a4 4 0 0 1-8 0z M8 6H5a3 3 0 0 0 3 4 M16 6h3a3 3 0 0 1-3 4 M12 13v4 M8.5 20h7 M10 17h4' },
  military_tech: { d: 'M8 3h8l-2 6h-4z M17 15a5 5 0 1 1-10 0a5 5 0 1 1 10 0 M12 13v4' },
  local_fire_department: { d: 'M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10c-2 2-3 4-3 6c-1-1-1.5-2-1.5-3C7.5 10 6 12.5 6 15a6 6 0 0 0 6 6z', fillable: true },
  bolt: { d: 'M13 3L5 13.5h6L10 21l8-10.5h-6z', fillable: true },
  block: { d: 'M20 12a8 8 0 1 1-16 0a8 8 0 1 1 16 0 M6.4 6.4l11.2 11.2' },
  warning: { d: 'M12 4L2.8 19.5h18.4z M12 10v4 M12 17h.01' },
};

/**
 * Stroke compensation: a line that looks right at 24px is too thin at 16 and too heavy
 * at 36, so the weight moves the other way from the size.
 */
export function strokeForSize(size: number): number {
  if (size <= 16) return 2.1;
  if (size <= 20) return 1.9;
  if (size <= 24) return 1.75;
  return 1.5;
}
