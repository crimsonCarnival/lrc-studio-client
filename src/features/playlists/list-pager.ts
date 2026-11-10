/**
 * Pure paging and URL-param helpers for the lists screens (profile Lists tab,
 * all-lists page). Pages are 1-based everywhere, matching what the URL shows.
 */

/** A page number, or a gap drawn as an ellipsis. */
export type PageItem = number | 'gap';

/** Number of pages needed for `total` items; at least 1 so an empty list still has "page 1". */
export function pageCount(total: number, perPage: number): number {
  if (!Number.isFinite(total) || total <= 0 || perPage <= 0) return 1;
  return Math.ceil(total / perPage);
}

/**
 * The page buttons to draw: every page when there are few, otherwise the first,
 * the last, and `siblings` pages either side of `current`, with gaps between.
 * A gap that would hide a single page shows that page instead.
 */
export function pageWindow(current: number, totalPages: number, siblings = 1): PageItem[] {
  const last = Math.max(1, Math.floor(totalPages));
  const cur = Math.min(Math.max(1, Math.floor(current)), last);
  // first + last + current + siblings on both sides + two gaps
  if (last <= 5 + siblings * 2) return Array.from({ length: last }, (_, i) => i + 1);

  const start = Math.max(2, cur - siblings);
  const end = Math.min(last - 1, cur + siblings);
  const items: PageItem[] = [1];
  if (start === 3) items.push(2);
  else if (start > 3) items.push('gap');
  for (let p = start; p <= end; p++) items.push(p);
  if (end === last - 2) items.push(last - 1);
  else if (end < last - 2) items.push('gap');
  items.push(last);
  return items;
}

/** A 1-based page from a search param; anything that isn't a positive integer is page 1. */
export function parsePage(raw: string | null | undefined): number {
  if (!raw || !/^\d+$/.test(raw)) return 1;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n >= 1 ? n : 1;
}

/** `raw` if it is one of `allowed`, else `fallback`. */
export function parseOption<T extends string>(raw: string | null | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.includes(raw as T) ? (raw as T) : fallback;
}

/** The 1-based item range shown on `page`, e.g. 7–12; null when the page is empty. */
export function pageRange(page: number, perPage: number, shown: number): { from: number; to: number } | null {
  if (shown <= 0) return null;
  const from = (page - 1) * perPage + 1;
  return { from, to: from + shown - 1 };
}
