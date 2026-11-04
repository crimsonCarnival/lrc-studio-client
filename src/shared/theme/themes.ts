import { PALETTES, type ThemePalette } from './theme-palettes';

/** `dark` and `light` are the Rosé Pine themes in index.css; every other id is a palette. */
export const BUILT_IN_THEMES = ['dark', 'light'] as const;
export const DEFAULT_THEME = 'dark';

export const THEME_PALETTES = PALETTES;
const BY_ID = new Map(PALETTES.map((p) => [p.id, p]));

export const paletteById = (id: string | null | undefined): ThemePalette | null => BY_ID.get(id ?? '') ?? null;

// ---- colour maths ----

const parse = (hex: string): [number, number, number] => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const toHex = (rgb: number[]): string =>
  `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;

/** `a` blended toward `b` by `amount` (0 = a, 1 = b). */
export const mix = (a: string, b: string, amount: number): string => {
  const [x, y] = [parse(a), parse(b)];
  return toHex(x.map((v, i) => v + (y[i] - v) * amount));
};

export const rgba = (hex: string, alpha: number): string => {
  const [r, g, b] = parse(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** WCAG relative luminance, 0 = black, 1 = white. */
export const luminance = (hex: string): number => {
  const [r, g, b] = parse(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Light means black text beats white text on it (luminance above ~0.18), not "looks pale": mid-tone palettes
// like botanical have no white that reaches 4.5:1, but black does.
const isLight = (bg: string): boolean => luminance(bg) > 0.179;

/**
 * `fg` pushed toward white (on a dark ground) or black (on a light one) until it reaches `min`
 * contrast against `bg`. Palettes were made for a typing box, not for body text: several have
 * a text colour that is unreadable as UI chrome, and this is what keeps every theme legible.
 */
export const ensureContrast = (fg: string, bg: string, min: number): string => {
  if (contrast(fg, bg) >= min) return fg;
  const target = isLight(bg) ? '#000000' : '#ffffff';
  for (let step = 1; step <= 20; step++) {
    const next = mix(fg, target, step / 20);
    if (contrast(next, bg) >= min) return next;
  }
  return target;
};

/** Black or white, whichever reads better on `hex`. */
const readableOn = (hex: string): string => (contrast('#000000', hex) >= contrast('#ffffff', hex) ? '#000000' : '#ffffff');


// ---- hue families ----
// Components use Tailwind's named colours directly (text-red-400, bg-emerald-500, border-amber-500).
// Tailwind v4 compiles those to var(--color-<family>-<shade>), so re-pointing the variables makes
// every one of them follow the theme without touching a single class name.

const rgbToHsl = (hex: string): [number, number, number] => {
  const [r, g, b] = parse(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};

const hslToHex = (h: number, s: number, l: number): string => {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex([f(0) * 255, f(8) * 255, f(4) * 255]);
};

/** Tailwind's hue and saturation per family (its 500 shade). */
const FAMILIES: Record<string, [number, number]> = {
  red: [0, 0.84], orange: [25, 0.95], amber: [38, 0.92], yellow: [48, 0.96], lime: [84, 0.81],
  green: [142, 0.71], emerald: [160, 0.84], teal: [173, 0.8], cyan: [189, 0.94], sky: [199, 0.89],
  blue: [217, 0.91], indigo: [239, 0.84], violet: [258, 0.9], purple: [271, 0.91], fuchsia: [292, 0.84],
  pink: [330, 0.81], rose: [350, 0.89],
};
const SHADE_LIGHTNESS: Record<number, number> = { 50: 0.97, 100: 0.93, 200: 0.86, 300: 0.77, 400: 0.67, 500: 0.58, 600: 0.5, 700: 0.42, 800: 0.34, 900: 0.27, 950: 0.17 };

/** One shade of a family, calmed to the theme's saturation and tinted a little toward its main colour. */
function shade(family: string, n: number, main: string): string {
  const [h, s] = FAMILIES[family];
  const mainSat = rgbToHsl(main)[1];
  const calm = 0.5 + 0.5 * Math.min(1, mainSat / 0.5);
  return mix(hslToHex(h, s * calm, SHADE_LIGHTNESS[n]), main, 0.1);
}

function familyVars(main: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const family of Object.keys(FAMILIES)) {
    for (const n of Object.keys(SHADE_LIGHTNESS)) out[`--color-${family}-${n}`] = shade(family, Number(n), main);
  }
  return out;
}

/**
 * Corner and shadow character per theme. `soft` is index.css as it is; `sharp` squares every
 * corner and drops the glows (terminal, editor-scheme and print-like palettes); `round` is
 * larger radii (the pastel and playful ones). `rounded-full` pills are never affected.
 */
export type ThemeShape = 'soft' | 'sharp' | 'round';

const SHARP = ['matrix', 'terminal', 'cyberpunk', 'carbon', 'paper', 'red-dragon', 'night-runner', 'monokai', 'solarized-dark', 'solarized-light', 'gruvbox-dark', 'gruvbox-light', 'github-dark'];
const ROUND = ['sakura', 'mint', 'vaporwave', 'beach', 'honey', 'bliss', 'lavender', 'bento', 'botanical', 'olivia', 'dots', 'arctic'];

export const shapeOf = (id: string): ThemeShape => (SHARP.includes(id) ? 'sharp' : ROUND.includes(id) ? 'round' : 'soft');

const SHAPE_VARS: Record<ThemeShape, Record<string, string>> = {
  soft: {},
  sharp: {
    '--radius': '0px', '--radius-chip': '0px', '--radius-control': '0px', '--radius-card': '0px',
    '--shadow-glow': 'none', '--shadow-glow-strong': 'none', '--shadow-card': 'none', '--shadow-elevated': '0 0 0 1px var(--border)',
  },
  round: { '--radius': '1rem', '--radius-chip': '12px', '--radius-control': '16px', '--radius-card': '28px' },
};

/** What the theme editor can change on top of a palette. Anything left out keeps the theme's own look. */
export type ThemeOverrides = {
  /** Corner radius in px, 0-32. Replaces the theme's shape. */
  radius?: number;
  glow?: 'off' | 'soft' | 'strong';
  borders?: 'subtle' | 'normal' | 'strong';
};

export const RADIUS_MAX = 32;

function radiusVars(r: number): Record<string, string> {
  const px = (n: number) => `${Math.round(n)}px`;
  const v = Math.min(RADIUS_MAX, Math.max(0, r));
  return { '--radius': px(v), '--radius-chip': px(v * 0.6), '--radius-control': px(v * 0.9), '--radius-card': px(v * 1.5) };
}

/**
 * Every custom property a palette overrides, and whether it is a dark theme (drives the `dark`
 * class). Surfaces, text, primary and destructive come from the palette; the semantic hues
 * (foam, gold, pine, rose) and every named Tailwind colour family are derived from the primary
 * colour's saturation, so status colours still read as red, green, amber but belong to the theme.
 */
export function themeTokens(p: ThemePalette, overrides: ThemeOverrides = {}): { dark: boolean; vars: Record<string, string> } {
  const light = isLight(p.bg);
  const bg = p.bg;
  const fg = ensureContrast(p.text, bg, 4.5);
  const primary = ensureContrast(p.main, bg, 3);
  const primaryInk = ensureContrast(p.main, bg, 4.5);
  const onPrimary = readableOn(primary);
  const error = ensureContrast(p.error, bg, 3);
  const errorInk = ensureContrast(p.error, bg, 4.5);
  const subtle = ensureContrast(mix(p.sub, fg, 0.25), bg, 4.5);
  const faint = ensureContrast(p.sub, bg, 3);

  const ground = light ? mix(bg, fg, 0.04) : mix(bg, '#000000', 0.2);
  const raised = light ? mix(bg, '#ffffff', 0.55) : mix(bg, fg, 0.06);
  const overlay = light ? mix(bg, fg, 0.07) : mix(bg, fg, 0.12);
  const hl = light ? mix(bg, fg, 0.15) : mix(bg, fg, 0.18);
  const border = light ? hl : rgba(fg, 0.12);
  const input = light ? hl : rgba(fg, 0.08);
  const card = light ? raised : ground;
  const glass = light ? rgba(bg, 0.85) : rgba(mix(bg, fg, 0.04), 0.85);

  const vars = {
      '--color-zinc-950': light ? bg : ground,
      '--color-zinc-900': light ? raised : bg,
      '--color-zinc-800': light ? overlay : raised,
      '--color-zinc-700': light ? hl : overlay,
      '--color-zinc-600': fg,
      '--color-zinc-500': fg,
      '--color-zinc-400': fg,
      '--color-zinc-300': fg,
      '--color-zinc-200': fg,
      '--color-zinc-100': fg,
      '--color-zinc-50': light ? fg : '#ffffff',
      '--background': bg,
      '--foreground': fg,
      '--card': card,
      '--card-foreground': fg,
      '--popover': raised,
      '--popover-foreground': fg,
      '--primary': primary,
      '--primary-foreground': onPrimary,
      '--secondary': overlay,
      '--secondary-foreground': fg,
      '--muted': overlay,
      '--muted-foreground': fg,
      '--accent': overlay,
      '--accent-foreground': fg,
      '--destructive': error,
      '--border': border,
      '--input': input,
      '--ring': primary,
      '--ground': ground,
      '--raised': raised,
      '--overlay': overlay,
      '--hl': hl,
      '--subtle': subtle,
      '--faint': faint,
      '--iris': primary,
      '--love': error,
      '--love-ink': errorInk,
      '--love-soft': rgba(error, 0.14),
      '--primary-hover': mix(primary, fg, 0.15),
      '--primary-press': mix(primary, bg, 0.2),
      '--primary-off': mix(bg, primary, 0.25),
      '--primary-ink': primaryInk,
      '--primary-soft': rgba(primary, 0.14),
      '--primary-strong': rgba(primary, 0.32),
      '--color-primary': primary,
      '--color-primary-dim': mix(primary, bg, 0.2),
      '--color-accent-purple': primary,
      '--color-surface': rgba(fg, 0.04),
      '--color-surface-hover': rgba(fg, 0.08),
      '--color-glass': glass,
      '--color-glass-border': rgba(primary, 0.15),
      '--shadow-glow': `0 0 20px ${rgba(primary, 0.2)}, 0 0 60px ${rgba(primary, 0.08)}`,
      '--shadow-glow-strong': `0 0 30px ${rgba(primary, 0.3)}, 0 0 80px ${rgba(primary, 0.12)}`,
      '--past': mix(primary, fg, 0.2),
      '--silver': mix(fg, bg, 0.2),
      '--knob': light ? raised : fg,
      '--tip': light ? mix(fg, bg, 0.15) : overlay,
      '--tip-foreground': light ? bg : fg,
      '--hatch': rgba(fg, 0.05),
      '--sidebar': ground,
      '--sidebar-foreground': fg,
      '--sidebar-primary': primary,
      '--sidebar-primary-foreground': onPrimary,
      '--sidebar-accent': overlay,
      '--sidebar-accent-foreground': fg,
      '--sidebar-border': border,
      '--sidebar-ring': primary,
  };
  // Semantic roles: dark themes read the 400 shade, light ones the 600, then are held to contrast.
  const at = light ? 600 : 400;
  const foam = ensureContrast(shade('teal', at, p.main), bg, 3);
  const pine = ensureContrast(shade('sky', at, p.main), bg, 3);
  const gold = ensureContrast(shade('amber', at, p.main), bg, 3);
  const roles: Record<string, string> = {
    '--foam': foam, '--foam-ink': ensureContrast(foam, bg, 4.5), '--foam-soft': rgba(foam, 0.14),
    '--pine': pine,
    '--gold': gold, '--gold-ink': ensureContrast(gold, bg, 4.5), '--gold-soft': rgba(gold, 0.14), '--mark': rgba(gold, 0.22),
    '--rose': ensureContrast(shade('orange', at, p.main), bg, 3),
    '--label': foam, '--focus': foam,
    '--success': foam, '--success-foreground': readableOn(foam),
    '--info': pine, '--info-foreground': readableOn(pine),
    '--warning': gold, '--warning-foreground': readableOn(gold),
    '--primary-rgb': parse(primary).join(', '), '--accent-blue-rgb': parse(foam).join(', '),
    '--color-warning': gold, '--color-warning-dim': mix(gold, bg, 0.2), '--color-accent-blue': foam,
  };

  const shape: Record<string, string> = overrides.radius !== undefined ? radiusVars(overrides.radius) : SHAPE_VARS[shapeOf(p.id)];
  const extras: Record<string, string> = {};
  if (overrides.glow === 'off') Object.assign(extras, { '--shadow-glow': 'none', '--shadow-glow-strong': 'none', '--shadow-card': 'none', '--shadow-elevated': '0 0 0 1px var(--border)' });
  if (overrides.glow === 'strong') {
    Object.assign(extras, {
      '--shadow-glow': `0 0 24px ${rgba(primary, 0.4)}, 0 0 70px ${rgba(primary, 0.18)}`,
      '--shadow-glow-strong': `0 0 36px ${rgba(primary, 0.55)}, 0 0 100px ${rgba(primary, 0.25)}`,
    });
  }
  if (overrides.borders && overrides.borders !== 'normal') {
    const strength = overrides.borders === 'strong' ? 0.32 : 0.07;
    Object.assign(extras, { '--border': mix(bg, fg, strength), '--input': mix(bg, fg, strength * 0.75), '--sidebar-border': mix(bg, fg, strength) });
  }
  return { dark: !light, vars: { ...familyVars(p.main), ...vars, ...roles, ...shape, ...extras } };
}

/** True for a built-in id or a palette id; anything else (stale or unknown) falls back to the default. */
export const isKnownTheme = (id: string | null | undefined): id is string =>
  !!id && ((BUILT_IN_THEMES as readonly string[]).includes(id) || id === 'custom' || BY_ID.has(id));

/** Browser chrome colour (`<meta name="theme-color">`) for a theme id. */
export const chromeColor = (id: string | null | undefined, paletteBg?: string): string => {
  const p = paletteById(id);
  if (paletteBg) return paletteBg;
  if (p) return p.bg;
  return id === 'light' ? '#faf4ed' : '#232136';
};
