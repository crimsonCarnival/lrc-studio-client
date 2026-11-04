import { THEME_PALETTES, RADIUS_MAX, shapeOf, type ThemeOverrides } from './themes';
import type { ThemePalette } from './theme-palettes';

/** The id the user's own theme is stored under in `interface.theme`. */
export const CUSTOM_THEME_ID = 'custom';

/** Server-side cap on the stored JSON (settings.resolvers.ts); a theme is ~200 bytes. */
export const CUSTOM_THEME_MAX_LENGTH = 600;

export type CustomTheme = {
  /** The theme it started from; only used to label and to reset. */
  base: string;
  bg: string;
  main: string;
  sub: string;
  text: string;
  error: string;
  radius: number;
  glow: NonNullable<ThemeOverrides['glow']>;
  borders: NonNullable<ThemeOverrides['borders']>;
};

export const COLOR_KEYS = ['bg', 'main', 'sub', 'text', 'error'] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

// `dark` and `light` have no palette (they live in index.css), so their six colours are written down
// here, taken from the Rosé Pine values in index.css, to give the editor something to start from.
const BUILT_IN_BASES: Record<string, ThemePalette> = {
  dark: { id: 'dark', name: 'dark', bg: '#232136', main: '#c4a7e7', sub: '#908caa', text: '#f0eeff', error: '#eb6f92' },
  light: { id: 'light', name: 'light', bg: '#faf4ed', main: '#6f5a8f', sub: '#6c6886', text: '#1a1826', error: '#b4637a' },
};

/** Everything the editor can start from: the two built-ins, then every palette. */
export const EDITOR_BASES: readonly ThemePalette[] = [BUILT_IN_BASES.dark, BUILT_IN_BASES.light, ...THEME_PALETTES];

export const basePalette = (id: string): ThemePalette => EDITOR_BASES.find((p) => p.id === id) ?? BUILT_IN_BASES.dark;

export const SHAPE_RADIUS = { sharp: 0, soft: 10, round: 16 } as const;

export function customFromBase(baseId: string): CustomTheme {
  const p = basePalette(baseId);
  return {
    base: p.id, bg: p.bg, main: p.main, sub: p.sub, text: p.text, error: p.error,
    radius: SHAPE_RADIUS[shapeOf(p.id)], glow: shapeOf(p.id) === 'sharp' ? 'off' : 'soft', borders: 'normal',
  };
}

const HEX = /^#[0-9a-f]{6}$/i;
const GLOWS = ['off', 'soft', 'strong'] as const;
const BORDERS = ['subtle', 'normal', 'strong'] as const;

/**
 * The stored value is user-controlled JSON that ends up in inline styles, so nothing is trusted:
 * colours must be 6-digit hex, the radius is clamped and the enums checked. Anything malformed
 * is dropped as a whole rather than half-applied.
 */
export function parseCustomTheme(raw: unknown): CustomTheme | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > CUSTOM_THEME_MAX_LENGTH) return null;
  let v: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    v = parsed as Record<string, unknown>;
  } catch {
    return null;
  }
  for (const k of COLOR_KEYS) if (typeof v[k] !== 'string' || !HEX.test(v[k] as string)) return null;
  const radius = Number(v.radius);
  if (!Number.isFinite(radius)) return null;
  if (!GLOWS.includes(v.glow as never) || !BORDERS.includes(v.borders as never)) return null;
  return {
    base: typeof v.base === 'string' && v.base.length <= 32 ? v.base : 'dark',
    bg: (v.bg as string).toLowerCase(), main: (v.main as string).toLowerCase(), sub: (v.sub as string).toLowerCase(),
    text: (v.text as string).toLowerCase(), error: (v.error as string).toLowerCase(),
    radius: Math.min(RADIUS_MAX, Math.max(0, Math.round(radius))),
    glow: v.glow as CustomTheme['glow'],
    borders: v.borders as CustomTheme['borders'],
  };
}

export const serializeCustomTheme = (c: CustomTheme): string => JSON.stringify(c);

export const customPalette = (c: CustomTheme): ThemePalette => ({ id: CUSTOM_THEME_ID, name: 'custom', bg: c.bg, main: c.main, sub: c.sub, text: c.text, error: c.error });

export const customOverrides = (c: CustomTheme): ThemeOverrides => ({ radius: c.radius, glow: c.glow, borders: c.borders });
