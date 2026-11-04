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

/**
 * Every custom property a palette overrides, and whether it is a dark theme (drives the `dark`
 * class). The semantic hues (foam, gold, pine, rose and what derives from them) are left to
 * index.css, which has a dark and a light set; a palette only recolours surfaces, text, the
 * primary colour and the destructive colour.
 */
export function themeTokens(p: ThemePalette): { dark: boolean; vars: Record<string, string> } {
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
  return { dark: !light, vars: { ...vars, ...SHAPE_VARS[shapeOf(p.id)] } };
}

/** True for a built-in id or a palette id; anything else (stale or unknown) falls back to the default. */
export const isKnownTheme = (id: string | null | undefined): id is string =>
  !!id && ((BUILT_IN_THEMES as readonly string[]).includes(id) || BY_ID.has(id));

/** Browser chrome colour (`<meta name="theme-color">`) for a theme id. */
export const chromeColor = (id: string | null | undefined): string => {
  const p = paletteById(id);
  if (p) return p.bg;
  return id === 'light' ? '#faf4ed' : '#232136';
};
