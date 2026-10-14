/**
 * Badge emblems (redesign sheet 09): the shape says the category, the colour says the badge.
 * Everything is drawn on a 72px grid; glyphs are 24px icons placed in the middle.
 */
export type EmblemShape = 'shield' | 'record' | 'tile' | 'hexagon';

export const EMBLEM_SHAPES: Record<EmblemShape, { outer: string; inner: string }> = {
  // Account
  shield: {
    outer: 'M36 6l24 8v18c0 16-10 27-24 34C22 59 12 48 12 32V14z',
    inner: 'M36 12l18 6v14c0 12-7.5 20.5-18 26C25.5 52.5 18 44 18 32V18z',
  },
  // Sync
  record: {
    outer: 'M36 6a30 30 0 1 1 0 60a30 30 0 1 1 0-60z',
    inner: 'M36 13a23 23 0 1 1 0 46a23 23 0 1 1 0-46z',
  },
  // Creation
  tile: {
    outer: 'M18 8h36a10 10 0 0 1 10 10v36a10 10 0 0 1-10 10H18A10 10 0 0 1 8 54V18A10 10 0 0 1 18 8z',
    inner: 'M20 14h32a6 6 0 0 1 6 6v32a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6z',
  },
  // Social and streak
  hexagon: {
    outer: 'M36 5l27 15.5v31L36 67 9 51.5v-31z',
    inner: 'M36 12l21 12v24L36 60 15 48V24z',
  },
};

const GLYPHS = {
  crown: 'M4 17l2-10 4.5 5L12 5l1.5 7L18 7l2 10z M4 20h16',
  flag: 'M6 21V4 M6 4h10l-2.5 3.5L16 11H6',
  hourglass: 'M7 3h10 M7 21h10 M8 3c0 5 8 5 8 9s-8 4-8 9 M16 3c0 5-8 5-8 9s8 4 8 9',
  check: 'M5 12.5l4.5 4.5L19 7',
  wave: 'M3 12h1 M7 9v6 M11 5v14 M15 8v8 M19 11v2',
  clock: 'M20 12a8 8 0 1 1-16 0a8 8 0 1 1 16 0 M12 7.5V12l3 2',
  pen: 'M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4',
  words: 'M3 9.5A1.5 1.5 0 0 1 4.5 8h3A1.5 1.5 0 0 1 9 9.5v5A1.5 1.5 0 0 1 7.5 16h-3A1.5 1.5 0 0 1 3 14.5z M11 9.5A1.5 1.5 0 0 1 12.5 8h7A1.5 1.5 0 0 1 21 9.5v5a1.5 1.5 0 0 1-1.5 1.5h-7a1.5 1.5 0 0 1-1.5-1.5z',
  mic: 'M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0z M5.5 11a6.5 6.5 0 0 0 13 0 M12 17.5V21 M9 21h6',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  library: 'M5 4v16 M9.5 4v16 M14 5l4.5 15',
  upload: 'M12 15V4 M7.5 8.5L12 4l4.5 4.5 M5 19h14',
  globe: 'M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0 M3 12h18 M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9 M12 3c-2.5 2.5-3.5 5.5-3.5 9s1 6.5 3.5 9',
  users: 'M14 8a4 4 0 1 1-8 0a4 4 0 1 1 8 0 M3 20a7 7 0 0 1 14 0 M16 4.5a4 4 0 0 1 0 7 M19 14.5a7 7 0 0 1 2.5 5.5',
  fork: 'M7 6a2 2 0 1 1-4 0a2 2 0 1 1 4 0 M21 6a2 2 0 1 1-4 0a2 2 0 1 1 4 0 M14 19a2 2 0 1 1-4 0a2 2 0 1 1 4 0 M5 8v1.5a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8 M12 12.5V17',
  flame: 'M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10c-2 2-3 4-3 6c-1-1-1.5-2-1.5-3C7.5 10 6 12.5 6 15a6 6 0 0 0 6 6z',
  bolt: 'M13 3L5 13.5h6L10 21l8-10.5h-6z',
};

export type Emblem = {
  shape: EmblemShape;
  glyph: string;
  /** A theme colour, as a CSS value. */
  color: string;
  /** Three dots under the glyph: the higher tier of a badge that shares its glyph. */
  pips?: boolean;
};

const gold = 'var(--color-gold)';
const foam = 'var(--color-foam)';
const iris = 'var(--color-iris)';
const love = 'var(--color-love)';
const rose = 'var(--color-rose)';
const pine = 'var(--color-pine)';

const BUILTIN: Record<string, Emblem> = {
  og:           { shape: 'shield',  glyph: GLYPHS.crown,     color: gold },
  pioneer:      { shape: 'shield',  glyph: GLYPHS.flag,      color: foam },
  verified:     { shape: 'shield',  glyph: GLYPHS.check,     color: iris },
  veteran:      { shape: 'shield',  glyph: GLYPHS.hourglass, color: love },
  admin:        { shape: 'shield',  glyph: GLYPHS.wave,      color: rose },
  syncer10h:    { shape: 'record',  glyph: GLYPHS.clock,     color: foam },
  syncer100h:   { shape: 'record',  glyph: GLYPHS.clock,     color: foam, pips: true },
  wordsmith1k:  { shape: 'record',  glyph: GLYPHS.pen,       color: iris },
  wordsmith50k: { shape: 'record',  glyph: GLYPHS.words,     color: gold },
  karaoke100:   { shape: 'record',  glyph: GLYPHS.mic,       color: iris },
  karaoke1k:    { shape: 'record',  glyph: GLYPHS.star,      color: gold },
  century:      { shape: 'tile',    glyph: GLYPHS.library,   color: pine },
  uploader:     { shape: 'tile',    glyph: GLYPHS.upload,    color: iris },
  published10:  { shape: 'tile',    glyph: GLYPHS.globe,     color: foam },
  following50:  { shape: 'hexagon', glyph: GLYPHS.users,     color: iris },
  beloved:      { shape: 'hexagon', glyph: GLYPHS.star,      color: gold },
  influential:  { shape: 'hexagon', glyph: GLYPHS.fork,      color: foam },
  streak7:      { shape: 'hexagon', glyph: GLYPHS.flame,     color: rose },
  streak30:     { shape: 'hexagon', glyph: GLYPHS.bolt,      color: gold, pips: true },
};

// Staff-defined badges carry one of the legacy colour names and no category, so they get a
// record with a star in the nearest theme colour.
const LEGACY_COLOR: Record<string, string> = {
  amber: gold, shimmer: gold, teal: foam, blue: foam, green: pine, primary: iris, rose, orange: rose,
};

export function emblemFor(id: string, legacyColor?: string): Emblem {
  return BUILTIN[id] ?? { shape: 'record', glyph: GLYPHS.star, color: LEGACY_COLOR[legacyColor ?? ''] ?? iris };
}
