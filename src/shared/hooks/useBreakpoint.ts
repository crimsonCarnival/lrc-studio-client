import useMediaQuery from './useMediaQuery';
import { isMobileHost } from '@/shared/utils/host';

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
  const matches = useMediaQuery(`(min-width: ${BREAKPOINTS[bp]})`);
  // The mobile host is a deliberate request for the narrow layout regardless of
  // how much room the window actually has, so it reports false for every
  // breakpoint at or above `lg` — the point where the app goes multi-column.
  // Smaller breakpoints still answer honestly, since they drive spacing and
  // type scale rather than the layout switch.
  if (isMobileHost() && (bp === 'lg' || bp === 'xl' || bp === '2xl')) return false;
  return matches;
}

/**
 * Narrower than `lg` — the width at which the app switches to its single-column
 * layout. Named for what it measures: screen size, not input method.
 */
export function useIsNarrow(): boolean {
  return !useBreakpoint('lg');
}
