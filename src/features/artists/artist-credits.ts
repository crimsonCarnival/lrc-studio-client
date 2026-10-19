import {
  formatArtistDisplay, joinNames, primaryNames, validateArtistCredits,
  type ArtistCredit, type ArtistRole, type ArtistValidationCode,
} from '@/shared/utils/artists';

export type { ArtistCredit, ArtistRole };

/** The slice of project metadata that carries artists. `songArtist` is the server's read-only display string. */
export interface ArtistMetadata {
  artists?: ArtistCredit[] | null;
  songArtist?: string | null;
}

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim();
export const nameKey = (name: string) => name.normalize('NFC').toLowerCase();

/** Primaries first, then featured; `order` is the index. */
export function renumber(credits: readonly ArtistCredit[]): ArtistCredit[] {
  const byRole = (role: ArtistRole) => credits.filter((c) => c.role === role);
  return [...byRole('primary'), ...byRole('featured')].map((c, order) => ({ name: c.name, role: c.role, order }));
}

/** The credits of a project, in display order. `[]` for a legacy row that only has `songArtist` text. */
export function creditsOf(meta: ArtistMetadata | null | undefined): ArtistCredit[] {
  const list = meta?.artists;
  if (!Array.isArray(list) || list.length === 0) return [];
  const sorted = [...list].sort((a, b) => a.order - b.order);
  return renumber(sorted);
}

/** What to show for the artists: built from the credits, falling back to `songArtist` for legacy rows. */
export function artistDisplay(meta: ArtistMetadata | null | undefined): string {
  const credits = creditsOf(meta);
  return credits.length > 0 ? formatArtistDisplay(credits) : (meta?.songArtist ?? '').trim();
}

/** Every credited name, primaries then featured: the singer choices for assigning lines. */
export function artistRoster(meta: ArtistMetadata | null | undefined): string[] {
  return creditsOf(meta).map((c) => c.name);
}

/** The primary names as one string, for lookups that take a single artist (lyrics search, track metadata). */
export function primaryArtistText(credits: readonly ArtistCredit[]): string {
  return joinNames(primaryNames(credits));
}

/** The write shape: `{ name, role }` in display order, primaries first. */
export function toArtistInput(credits: readonly ArtistCredit[]): Array<{ name: string; role: ArtistRole }> {
  return renumber(credits).map(({ name, role }) => ({ name, role }));
}

/** Adds `incoming` after `existing`, dropping names already present (case-insensitive; existing wins). */
export function mergeCredits(existing: readonly ArtistCredit[], incoming: readonly ArtistCredit[]): ArtistCredit[] {
  const seen = new Set(existing.map((c) => nameKey(c.name)));
  const added: ArtistCredit[] = [];
  for (const c of incoming) {
    const key = nameKey(c.name);
    if (seen.has(key)) continue;
    seen.add(key);
    added.push({ name: tidy(c.name), role: c.role, order: 0 });
  }
  return renumber([...existing, ...added]);
}

export function creditsEqual(a: readonly ArtistCredit[], b: readonly ArtistCredit[]): boolean {
  const x = renumber(a);
  const y = renumber(b);
  return x.length === y.length && x.every((c, i) => c.name === y[i].name && c.role === y[i].role);
}

/** Metadata ready to keep in app state: credits plus the derived display string (never sent to the server). */
export function withArtists<T extends object>(meta: T, credits: readonly ArtistCredit[]): T & { artists: ArtistCredit[]; songArtist: string } {
  const artists = renumber(credits);
  return { ...meta, artists, songArtist: formatArtistDisplay(artists) };
}

/**
 * The artist fields to put in project metadata after a form: the credits, the derived display
 * string for local screens, and a flag saying the credits were edited. `artists` is only sent to
 * the server when it is non-empty or flagged: omitted keeps what is stored, `[]` clears it, so an
 * untouched legacy row (credits `[]`, text only) is never wiped by an unrelated save.
 */
export function artistFieldsFromForm(data: { artists?: ArtistCredit[]; artistsChanged?: boolean }) {
  const artists = renumber(data.artists ?? []);
  return { artists, songArtist: formatArtistDisplay(artists), artistsDirty: data.artistsChanged === true };
}

/** The first problem with these credits, as the code the server would answer with; null when fine. */
export function creditsProblem(credits: readonly ArtistCredit[]): { code: ArtistValidationCode; name?: string } | null {
  const result = validateArtistCredits(toArtistInput(credits));
  if (result.ok) return null;
  let name: string | undefined;
  if (result.code === 'artist_duplicate') {
    const seen = new Set<string>();
    name = credits.find((c) => {
      const k = nameKey(c.name);
      if (seen.has(k)) return true;
      seen.add(k);
      return false;
    })?.name;
  }
  return { code: result.code, name };
}

