import useMediaQuery from './useMediaQuery';

/**
 * Tailwind's default breakpoints, in the same units Tailwind uses. Keep this in
 * sync with any `--breakpoint-*` overrides in index.css.
 */
export const BREAKPOINTS = {
  sm: '40rem',
  md: '48rem',
  lg: '64rem',
  xl: '80rem',
  '2xl': '96rem',
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * True at or above the given Tailwind breakpoint.
 *
 * This is about how much room there is, which is a separate question from
 * whether the user is touching the screen — see `useInputMethod`. Conflating
 * the two gives a phone layout to an iPad in landscape and a desktop layout to
 * a 400px-wide browser window.
 */
export function useBreakpoint(bp: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS[bp]})`);
}

/**
 * Narrower than `lg` — the width at which the app switches to its single-column
 * layout. Named for what it measures: screen size, not input method.
 */
export function useIsNarrow(): boolean {
  return !useBreakpoint('lg');
}
