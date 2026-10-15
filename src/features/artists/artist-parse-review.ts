import { parseArtists, type ArtistCredit, type ArtistRole, type ParseFlag, type ParsedArtists } from '@/shared/utils/artists';
import { renumber } from './artist-credits';

/**
 * Turns a parse result into something a person can confirm. The parser never guesses:
 * a doubtful split (`&` / `and` / `x`), a bare `ft` / `feat`, an empty marker or an
 * unbalanced bracket comes back as a flag, and this module is what the review UI reads
 * and what turns the user's answers into the credits that actually get applied.
 */

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim();
const SEPARATORS = /(\s*,\s*|\s*&\s*|\s+and\s+|\s+[x×]\s+)/i;

export interface AmbiguousGroup {
  /** The flagged segment as written, e.g. `Simon & Garfunkel`. */
  text: string;
  source: ParseFlag['source'];
  parts: string[];
  /** Normalised separator between `parts[i]` and `parts[i + 1]`, to rebuild a merged name. */
  separators: string[];
}

export interface ParsePlan {
  raw: { artist: string; title?: string };
  /** Force every resulting credit into this role (the Featured field takes whatever it is given as featured). */
  role?: ArtistRole;
  parsed: ParsedArtists;
  groups: AmbiguousGroup[];
  weak: ParseFlag[];
  /** Empty marker, unbalanced bracket: text was left as typed. */
  warnings: ParseFlag[];
  /** Informational. */
  duplicates: ParseFlag[];
}

/** `A, B & C` as names plus the separators between them. */
export function splitWithSeparators(text: string): { parts: string[]; separators: string[] } {
  const pieces = text.split(SEPARATORS);
  const parts: string[] = [];
  const separators: string[] = [];
  pieces.forEach((piece, i) => {
    if (i % 2 === 0) {
      const name = tidy(piece);
      if (name) parts.push(name);
    } else {
      const sep = tidy(piece);
      separators.push(sep === ',' ? ', ' : ` ${sep} `);
    }
  });
  return { parts, separators: separators.slice(0, Math.max(0, parts.length - 1)) };
}

/** The names a group becomes: `merge[i]` joins `parts[i]` and `parts[i + 1]` back into one artist, with the original separator. */
export function mergedNames(group: Pick<AmbiguousGroup, 'parts' | 'separators'>, merge: readonly boolean[]): string[] {
  const names: string[] = [];
  group.parts.forEach((part, i) => {
    if (i > 0 && merge[i - 1]) names[names.length - 1] += `${group.separators[i - 1]}${part}`;
    else names.push(part);
  });
  return names;
}

export function buildPlan(raw: { artist: string; title?: string }, role?: ArtistRole): ParsePlan {
  const parsed = parseArtists(raw.artist, raw.title);
  const flags = parsed.flags;
  return {
    raw,
    role,
    parsed,
    groups: flags
      .filter((f) => f.code === 'ambiguous_separator')
      .map((f) => ({ text: f.text, source: f.source, ...splitWithSeparators(f.text) })),
    weak: flags.filter((f) => f.code === 'weak_marker'),
    warnings: flags.filter((f) => f.code === 'empty_feat_segment' || f.code === 'unbalanced_bracket'),
    duplicates: flags.filter((f) => f.code === 'duplicate_removed'),
  };
}

/** Anything the person should see before the result is applied. */
export function needsReview(plan: ParsePlan): boolean {
  return plan.parsed.flags.length > 0;
}

export interface PlanDecisions {
  /** Per ambiguous group: `merge[i]` joins `parts[i]` and `parts[i + 1]` back into one artist. */
  merges: boolean[][];
  /** Apply a bare `ft` / `feat` as a featured marker. When false the text stays as typed. */
  acceptWeak: boolean;
}

export const defaultDecisions = (plan: ParsePlan): PlanDecisions => ({
  merges: plan.groups.map((g) => g.parts.slice(1).map(() => false)),
  acceptWeak: false,
});

/** The credits (and cleaned title, if any) after the person's answers. */
export function applyPlan(plan: ParsePlan, decisions: PlanDecisions): { credits: ArtistCredit[]; title: string | null } {
  let parsed = plan.parsed;
  let keepArtistAsTyped = false;
  if (plan.weak.length > 0 && !decisions.acceptWeak) {
    const artistWeak = plan.weak.some((f) => f.source === 'artist');
    const titleWeak = plan.weak.some((f) => f.source === 'title');
    keepArtistAsTyped = artistWeak;
    parsed = parseArtists(artistWeak ? '' : plan.raw.artist, titleWeak ? undefined : plan.raw.title);
  }

  let credits = parsed.credits.map((c) => ({ ...c }));
  if (keepArtistAsTyped && tidy(plan.raw.artist)) {
    credits = [{ name: tidy(plan.raw.artist), role: 'primary' as ArtistRole, order: 0 }, ...credits];
  }

  plan.groups.forEach((group, gi) => {
    const merge = decisions.merges[gi] ?? [];
    if (!merge.some(Boolean)) return;
    const names = mergedNames(group, merge);
    const at = credits.findIndex((_, i) => group.parts.every((p, k) => credits[i + k]?.name === p));
    if (at === -1) return;
    const role = credits[at].role;
    credits.splice(at, group.parts.length, ...names.map((name) => ({ name, role, order: 0 })));
  });

  if (plan.role) credits = credits.map((c) => ({ ...c, role: plan.role as ArtistRole }));
  return { credits: renumber(credits), title: parsed.title };
}
