/**
 * Pure summaries of a playlist's projects for the list page (hero runtime, track
 * lengths, "About this list"). No React, no i18n: callers translate the results.
 */
import { parseArtists } from '@/shared/utils/artists';

/** The slice of a playlist project these helpers read. */
export type StatsProject = {
  hasWordSync?: boolean | null;
  metadata?: { songArtist?: string | null; genre?: string | null } | null;
  upload?: { duration?: number | null } | null;
};

const validSeconds = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/** Sum of the projects' media durations. Projects with no known duration add nothing. */
export function totalDurationSeconds(projects: readonly StatsProject[]): number {
  let total = 0;
  for (const p of projects) {
    const d = p.upload?.duration;
    if (validSeconds(d)) total += d;
  }
  return total;
}

/**
 * A runtime split for display. `key` picks the phrasing (an i18n key suffix):
 * `hm` → "1 h 5 min" (seconds dropped past an hour), `ms` → "31 min 42 s", `s` → "42 s".
 */
export type Runtime = {
  key: 'hm' | 'ms' | 's';
  hours: number;
  minutes: number;
  seconds: number;
};

/** Null when there is nothing to show (no known durations). */
export function formatRuntime(totalSeconds: number): Runtime | null {
  if (!validSeconds(totalSeconds)) return null;
  const whole = Math.round(totalSeconds);
  if (whole === 0) return null;
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;
  if (hours > 0) return { key: 'hm', hours, minutes, seconds };
  if (minutes > 0) return { key: 'ms', hours, minutes, seconds };
  return { key: 's', hours, minutes, seconds };
}

/** A track length as `m:ss` (`h:mm:ss` past an hour); null when unknown. */
export function formatTrackLength(seconds: number | null | undefined): string | null {
  if (!validSeconds(seconds)) return null;
  const whole = Math.round(seconds);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = String(whole % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export function wordSyncedCount(projects: readonly StatsProject[]): number {
  return projects.filter((p) => p.hasWordSync === true).length;
}

/**
 * Most frequent genre, compared case-insensitively and shown in its first-seen
 * spelling. A tie goes to the genre that appears first in list order. Null when
 * no project has a genre.
 */
export function topGenre(projects: readonly StatsProject[]): string | null {
  const counts = new Map<string, { label: string; count: number; first: number }>();
  projects.forEach((p, i) => {
    const label = p.metadata?.genre?.trim();
    if (!label) return;
    const key = label.toLowerCase();
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { label, count: 1, first: i });
  });
  let best: { label: string; count: number; first: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count || (entry.count === best.count && entry.first < best.first)) best = entry;
  }
  return best?.label ?? null;
}

/**
 * Distinct artists across the list. Artist strings are split into credits the
 * same way the rest of the app parses them ("A, B feat. C" is three artists),
 * and compared case-insensitively.
 */
export function distinctArtistCount(projects: readonly StatsProject[]): number {
  const seen = new Set<string>();
  for (const p of projects) {
    const text = p.metadata?.songArtist?.trim();
    if (!text) continue;
    for (const credit of parseArtists(text).credits) {
      seen.add(credit.name.normalize('NFC').toLowerCase());
    }
  }
  return seen.size;
}
