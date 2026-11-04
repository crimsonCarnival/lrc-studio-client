import { chromeColor, paletteById, themeTokens } from './themes';

/** Read by the first-paint script in index.html, so a palette theme does not flash dark on load. */
export const THEME_CACHE_KEY = 'lrc-theme-cache';

let appliedVars: string[] = [];

/**
 * Puts a theme on <html>: the `dark` class, the palette's custom properties as inline styles
 * (which beat the stylesheet's `.dark` / `:root` sets), and the browser chrome colour.
 * `dark` and `light` carry no inline properties; they are index.css alone.
 */
export function applyTheme(id: string | undefined): void {
  const root = document.documentElement;
  for (const name of appliedVars) root.style.removeProperty(name);
  appliedVars = [];

  const palette = paletteById(id);
  if (!palette) {
    root.classList.toggle('dark', id !== 'light');
    root.style.removeProperty('color-scheme');
    try { localStorage.removeItem(THEME_CACHE_KEY); } catch { /* storage unavailable */ }
  } else {
    const { dark, vars } = themeTokens(palette);
    root.classList.toggle('dark', dark);
    root.style.setProperty('color-scheme', dark ? 'dark' : 'light');
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
    appliedVars = Object.keys(vars);
    try { localStorage.setItem(THEME_CACHE_KEY, JSON.stringify({ id, dark, vars })); } catch { /* storage unavailable */ }
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', chromeColor(id));
}
