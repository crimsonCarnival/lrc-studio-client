// MIRROR of lrc-studio-server/src/utils/artists.ts. Keep it byte-identical apart from this header: the
// server and the client must parse, format and validate artists the same way. Change it in the server first.
/**
 * Artist credits: parsing, formatting and validation. Single source of truth —
 * dependency-free on purpose so the web client can copy this file verbatim.
 *
 * A song has an ordered list of credits, each `primary` or `featured`.
 * `formatArtistDisplay` turns that list into the one string every
 * display / search / OG / LRC surface uses (`Primary feat. A & B`).
 */

export type ArtistRole = 'primary' | 'featured';

export interface ArtistCredit {
  name: string;
  role: ArtistRole;
  order: number;
}

export const ARTIST_LIMITS = {
  /** Total credits (primary + featured) per song. */
  maxArtists: 10,
  maxNameLength: 300,
} as const;

/** Markers that introduce featured artists. `with` counts only inside brackets. */
export const FEAT_MARKERS = ['feat.', 'feat', 'ft.', 'ft', 'featuring'] as const;

/** Separators between names. `,` is unambiguous; the others may be part of a name. */
export const NAME_SEPARATORS = [',', '&', ' and ', ' x ', ' × '] as const;

export type ParseFlagCode =
  /** Split on `&` / `and` / `x`: could be one act ("Simon & Garfunkel"). Confirm in the UI. */
  | 'ambiguous_separator'
  /** Bare `ft` / `feat` (no dot) outside brackets: could be a word ("Ft Lauderdale"). */
  | 'weak_marker'
  /** A marker with no names after it. Text is left untouched. */
  | 'empty_feat_segment'
  | 'unbalanced_bracket'
  /** A name appeared more than once; the later one was dropped. */
  | 'duplicate_removed';

export interface ParseFlag {
  code: ParseFlagCode;
  source: 'artist' | 'title';
  /** The text the flag is about. */
  text: string;
}

export interface ParsedArtists {
  /** Primaries first, then featured; `order` is the index in this list. */
  credits: ArtistCredit[];
  /** The title without its feat. segment — null when nothing was extracted from it. */
  title: string | null;
  flags: ParseFlag[];
}

const OPEN = '([';
const CLOSE = ')]';

const tidy = (s: string): string => s.replace(/\s+/g, ' ').trim();
const keyOf = (name: string): string => name.normalize('NFC').toLowerCase();

interface Extracted {
  rest: string;
  segments: string[];
  flags: ParseFlag[];
}

/** Marker at the very start of bracket content, e.g. `feat. A & B`, `with A`. */
const BRACKET_MARKER = /^(?:(?:feat|ft)\.\s*|(?:feat|ft|featuring|with)\s+)(.*)$/is;
/** Marker outside brackets; needs whitespace (or the start) before and whitespace (or the end) after. */
const BARE_MARKER = /(^|\s)(feat\.|ft\.|featuring|feat|ft)(?=\s|$)/i;

/** Index of the bracket closing the one opened at `start`, or -1. Counts both bracket kinds. */
function matchingClose(text: string, start: number): number {
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    if (OPEN.includes(text[i])) depth += 1;
    else if (CLOSE.includes(text[i])) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function extractFeatured(input: string, source: 'artist' | 'title'): Extracted {
  const flags: ParseFlag[] = [];
  const segments: string[] = [];

  // Pass 1: bracket groups. A group that starts with a marker is consumed whole;
  // any other group is searched recursively so `Song (Live (feat. A))` works.
  const walk = (text: string): string => {
    let out = '';
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (!OPEN.includes(ch)) {
        out += ch;
        i += 1;
        continue;
      }
      const close = matchingClose(text, i);
      if (close === -1) {
        flags.push({ code: 'unbalanced_bracket', source, text: text.slice(i) });
        out += text.slice(i);
        break;
      }
      const inner = text.slice(i + 1, close);
      const m = BRACKET_MARKER.exec(inner.trim());
      if (m) {
        if (tidy(m[1])) segments.push(tidy(m[1]));
        else {
          flags.push({ code: 'empty_feat_segment', source, text: text.slice(i, close + 1) });
          out += text.slice(i, close + 1);
        }
      } else {
        const innerRest = tidy(walk(inner));
        if (innerRest) out += `${ch}${innerRest}${text[close]}`;
        else if (!tidy(inner)) out += text.slice(i, close + 1); // an empty `()` already there: not ours to remove
      }
      i = close + 1;
    }
    return out;
  };
  let rest = walk(input);

  // Pass 2: a bare marker; the names run to the next bracket or the end.
  for (let guard = 0; guard < 5; guard += 1) {
    const m = BARE_MARKER.exec(rest);
    if (!m) break;
    const markerStart = m.index + m[1].length;
    const afterMarker = markerStart + m[2].length;
    const nextBracket = rest.slice(afterMarker).search(/[([]/);
    const namesEnd = nextBracket === -1 ? rest.length : afterMarker + nextBracket;
    const names = tidy(rest.slice(afterMarker, namesEnd));
    if (!names) {
      flags.push({ code: 'empty_feat_segment', source, text: rest.slice(markerStart) });
      break; // leave the text as it is; looping would find the same marker again
    }
    if (/^(?:feat|ft)$/i.test(m[2])) flags.push({ code: 'weak_marker', source, text: rest.slice(markerStart, namesEnd) });
    segments.push(names);
    rest = `${rest.slice(0, markerStart)}${rest.slice(namesEnd)}`;
  }

  return { rest: tidy(rest), segments, flags };
}

/** Splits `A, B & C` into names. Flags the segment when a non-comma separator was used. */
function splitNames(text: string, source: 'artist' | 'title', flags: ParseFlag[]): string[] {
  const parts = text.split(/\s*,\s*|\s*&\s*|\s+and\s+|\s+[x×]\s+/i);
  if (parts.length > 1 && /&|\s+and\s+|\s+[x×]\s+/i.test(text)) {
    flags.push({ code: 'ambiguous_separator', source, text });
  }
  return parts.map(tidy).filter(Boolean);
}

/**
 * Reads credits out of an artist string and (optionally) a title.
 *
 * - Featured artists come from `feat.` / `ft.` / `featuring` (and `with` inside
 *   brackets) in either string. The title comes back without that segment.
 * - The artist string's remainder is split into primaries on `,` `&` `and` `x`.
 * - Doubtful cases are flagged, never silently decided: see {@link ParseFlagCode}.
 */
export function parseArtists(artistText: string, titleText?: string): ParsedArtists {
  const flags: ParseFlag[] = [];
  const primaries: string[] = [];
  const featured: string[] = [];

  const fromArtist = extractFeatured(artistText ?? '', 'artist');
  flags.push(...fromArtist.flags);
  primaries.push(...splitNames(fromArtist.rest, 'artist', flags));
  for (const seg of fromArtist.segments) featured.push(...splitNames(seg, 'artist', flags));

  let title: string | null = null;
  if (titleText !== undefined) {
    const fromTitle = extractFeatured(titleText, 'title');
    flags.push(...fromTitle.flags);
    for (const seg of fromTitle.segments) featured.push(...splitNames(seg, 'title', flags));
    if (fromTitle.segments.length > 0) title = fromTitle.rest;
  }

  const seen = new Set<string>();
  const credits: ArtistCredit[] = [];
  const add = (name: string, role: ArtistRole, source: 'artist' | 'title'): void => {
    const key = keyOf(name);
    if (seen.has(key)) {
      flags.push({ code: 'duplicate_removed', source, text: name });
      return;
    }
    seen.add(key);
    credits.push({ name, role, order: credits.length });
  };
  for (const n of primaries) add(n, 'primary', 'artist');
  for (const n of featured) add(n, 'featured', 'artist');

  return { credits, title, flags };
}

/** `A` / `A & B` / `A, B & C`. */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

const byOrder = (a: ArtistCredit, b: ArtistCredit): number => a.order - b.order;

export function primaryNames(credits: readonly ArtistCredit[]): string[] {
  return credits.filter((c) => c.role === 'primary').sort(byOrder).map((c) => c.name);
}

export function featuredNames(credits: readonly ArtistCredit[]): string[] {
  return credits.filter((c) => c.role === 'featured').sort(byOrder).map((c) => c.name);
}

/** `Primary feat. A & B`, with primaries joined the same way. */
export function formatArtistDisplay(credits: readonly ArtistCredit[]): string {
  const main = joinNames(primaryNames(credits));
  const feat = joinNames(featuredNames(credits));
  if (!feat) return main;
  return main ? `${main} feat. ${feat}` : `feat. ${feat}`;
}

/** `Title (feat. A & B)` — used by the LRC export option; the title is returned as-is with no featured artists. */
export function formatTitleWithFeatured(title: string, credits: readonly ArtistCredit[]): string {
  const feat = joinNames(featuredNames(credits));
  return feat ? `${title} (feat. ${feat})` : title;
}

export type ArtistValidationCode =
  | 'artists_invalid'
  | 'artist_role_invalid'
  | 'artist_name_empty'
  | 'artist_name_too_long'
  | 'artists_too_many'
  | 'artist_duplicate'
  | 'artist_primary_required';

export type ArtistValidation =
  | { ok: true; credits: ArtistCredit[] }
  | { ok: false; code: ArtistValidationCode; message: string };

/**
 * Normalises and validates credits sent by a client. Names are trimmed and
 * whitespace-collapsed; the request order decides `order` within each role, and
 * primaries are listed before featured in the result. An empty list is valid
 * (a project need not have artists); a non-empty one needs a primary.
 */
export function validateArtistCredits(input: unknown): ArtistValidation {
  const fail = (code: ArtistValidationCode, message: string): ArtistValidation => ({ ok: false, code, message });
  if (!Array.isArray(input)) return fail('artists_invalid', 'artists must be a list');
  if (input.length > ARTIST_LIMITS.maxArtists) {
    return fail('artists_too_many', `A song can have at most ${ARTIST_LIMITS.maxArtists} artists`);
  }

  const seen = new Set<string>();
  const primaries: string[] = [];
  const featured: string[] = [];
  for (const raw of input) {
    const item = raw as { name?: unknown; role?: unknown } | null;
    if (!item || typeof item !== 'object') return fail('artists_invalid', 'Each artist must be an object');
    if (item.role !== 'primary' && item.role !== 'featured') {
      return fail('artist_role_invalid', 'Artist role must be "primary" or "featured"');
    }
    const name = typeof item.name === 'string' ? tidy(item.name) : '';
    if (!name) return fail('artist_name_empty', 'Artist names cannot be empty');
    if (name.length > ARTIST_LIMITS.maxNameLength) {
      return fail('artist_name_too_long', `Artist names are limited to ${ARTIST_LIMITS.maxNameLength} characters`);
    }
    const key = keyOf(name);
    if (seen.has(key)) return fail('artist_duplicate', `"${name}" is listed more than once`);
    seen.add(key);
    (item.role === 'primary' ? primaries : featured).push(name);
  }
  if (input.length > 0 && primaries.length === 0) {
    return fail('artist_primary_required', 'At least one primary artist is required');
  }

  const credits: ArtistCredit[] = [
    ...primaries.map((name, i): ArtistCredit => ({ name, role: 'primary', order: i })),
    ...featured.map((name, i): ArtistCredit => ({ name, role: 'featured', order: primaries.length + i })),
  ];
  return { ok: true, credits };
}
