// Remembers which path sat at each position of this tab's history, so the header can say
// where "back" leads. React Router stamps every entry with an increasing `history.state.idx`;
// the trail maps that index to the pathname that was there.

export type NavTrail = Record<number, string>;

const KEY = 'lrc-nav-trail';

export function readTrail(): NavTrail {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '{}') as NavTrail;
  } catch {
    return {};
  }
}

function writeTrail(trail: NavTrail): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(trail));
  } catch {
    /* storage unavailable: labels fall back to "Home" */
  }
}

/**
 * Records `pathname` at history position `idx`. A push invalidates everything ahead of it
 * (the browser drops forward entries), so those are forgotten too.
 */
export function recordVisit(idx: number, pathname: string, isPush: boolean): void {
  const trail = readTrail();
  if (isPush) {
    for (const key of Object.keys(trail)) {
      if (Number(key) > idx) delete trail[Number(key)];
    }
  }
  trail[idx] = pathname;
  writeTrail(trail);
}

/**
 * The nearest earlier entry on a *different* page, and how many steps back it is.
 * Entries with the same pathname are skipped: they are the same page with another query
 * string (a search refinement, a tab), and "back to Search" from Search would be noise.
 * Null when nothing is known, e.g. the tab was opened directly on this page.
 */
export function findPrevious(trail: NavTrail, idx: number, pathname: string): { path: string; delta: number } | null {
  for (let i = idx - 1; i >= 0; i--) {
    const path = trail[i];
    if (path === undefined) return null;
    if (path !== pathname) return { path, delta: i - idx };
  }
  return null;
}
