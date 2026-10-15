// MIRROR of lrc-studio-server/src/utils/artists.test.ts (behavioural spec for artists.ts). Keep it identical apart from this header.
import { describe, it, expect } from 'vitest';
import {
  parseArtists, formatArtistDisplay, joinNames, validateArtistCredits, formatTitleWithFeatured, ARTIST_LIMITS,
} from './artists.js';

const names = (r: ReturnType<typeof parseArtists>, role: 'primary' | 'featured') =>
  r.credits.filter((c) => c.role === role).map((c) => c.name);
const codes = (r: ReturnType<typeof parseArtists>) => r.flags.map((f) => f.code);

describe('parseArtists: featured markers', () => {
  it.each([
    ['Drake feat. Rihanna'], ['Drake feat Rihanna'], ['Drake ft. Rihanna'], ['Drake ft Rihanna'],
    ['Drake featuring Rihanna'], ['Drake (feat. Rihanna)'], ['Drake [ft. Rihanna]'],
    ['Drake (featuring Rihanna)'], ['Drake (with Rihanna)'], ['Drake [with Rihanna]'],
    ['DRAKE FEAT. RIHANNA'], ['Drake (FT Rihanna)'],
  ])('%s', (input) => {
    const r = parseArtists(input);
    expect(names(r, 'primary')).toEqual([input.startsWith('DRAKE') ? 'DRAKE' : 'Drake']);
    expect(names(r, 'featured')).toEqual([input.startsWith('DRAKE') ? 'RIHANNA' : 'Rihanna']);
  });

  it('treats "with" as a marker only inside brackets', () => {
    const r = parseArtists('Drake with Rihanna');
    expect(r.credits.map((c) => c.name)).toEqual(['Drake with Rihanna']);
    expect(names(r, 'featured')).toEqual([]);
  });

  it('flags bare ft / feat (no dot) outside brackets as weak, but not the dotted or bracketed forms', () => {
    expect(codes(parseArtists('Drake ft Rihanna'))).toContain('weak_marker');
    expect(codes(parseArtists('Drake feat Rihanna'))).toContain('weak_marker');
    expect(codes(parseArtists('Drake feat. Rihanna'))).not.toContain('weak_marker');
    expect(codes(parseArtists('Drake (ft Rihanna)'))).not.toContain('weak_marker');
  });

  it('does not match a marker inside a word', () => {
    expect(parseArtists('Soft Cell').credits.map((c) => c.name)).toEqual(['Soft Cell']);
    expect(parseArtists('Aft Featherstone').credits.map((c) => c.name)).toEqual(['Aft Featherstone']);
  });
});

describe('parseArtists: splitting', () => {
  it('splits featured names on , & and x', () => {
    expect(names(parseArtists('A feat. B, C & D'), 'featured')).toEqual(['B', 'C', 'D']);
    expect(names(parseArtists('A (feat. B and C)'), 'featured')).toEqual(['B', 'C']);
    expect(names(parseArtists('A feat. B x C'), 'featured')).toEqual(['B', 'C']);
    expect(names(parseArtists('A feat. B × C'), 'featured')).toEqual(['B', 'C']);
  });

  it('splits primaries on separators too', () => {
    expect(names(parseArtists('A, B & C'), 'primary')).toEqual(['A', 'B', 'C']);
    expect(names(parseArtists('A x B'), 'primary')).toEqual(['A', 'B']);
  });

  it('flags non-comma separators as ambiguous but not commas', () => {
    expect(codes(parseArtists('Simon & Garfunkel'))).toContain('ambiguous_separator');
    expect(codes(parseArtists('A and B'))).toContain('ambiguous_separator');
    expect(codes(parseArtists('A, B'))).not.toContain('ambiguous_separator');
    expect(codes(parseArtists('Solo Artist'))).toEqual([]);
  });

  it('does not treat a lone x inside a word as a separator', () => {
    expect(names(parseArtists('Xzibit'), 'primary')).toEqual(['Xzibit']);
    expect(names(parseArtists('Max Richter'), 'primary')).toEqual(['Max Richter']);
  });

  it('drops empty segments', () => {
    expect(names(parseArtists('A,, B , '), 'primary')).toEqual(['A', 'B']);
  });
});

describe('parseArtists: titles', () => {
  it('returns the cleaned title only when a segment was extracted', () => {
    expect(parseArtists('Drake', 'Song (feat. Rihanna)').title).toBe('Song');
    expect(parseArtists('Drake', 'Song feat. Rihanna').title).toBe('Song');
    expect(parseArtists('Drake', 'Plain Song').title).toBeNull();
    expect(parseArtists('Drake').title).toBeNull();
  });

  it('keeps the rest of the title, including other brackets', () => {
    expect(parseArtists('Drake', 'Song (feat. A) [Live]').title).toBe('Song [Live]');
    expect(parseArtists('Drake', 'Song feat. A (Remix)').title).toBe('Song (Remix)');
  });

  it('merges featured artists from artist and title', () => {
    const r = parseArtists('Drake feat. A', 'Song (feat. B)');
    expect(names(r, 'featured')).toEqual(['A', 'B']);
  });

  it('handles nested brackets', () => {
    const r = parseArtists('Drake', 'Song (Live (feat. A [JP]))');
    expect(r.title).toBe('Song (Live)');
    expect(names(r, 'featured')).toEqual(['A [JP]']);
    const r2 = parseArtists('Drake', 'Song [Acoustic (ft. B)] (Remix)');
    expect(r2.title).toBe('Song [Acoustic] (Remix)');
    expect(names(r2, 'featured')).toEqual(['B']);
  });

  it('flags unbalanced brackets and leaves the text', () => {
    const r = parseArtists('Drake', 'Song (feat. A');
    expect(codes(r)).toContain('unbalanced_bracket');
  });

  it('extracts several markers', () => {
    const r = parseArtists('Drake', 'Song (feat. A) (ft. B)');
    expect(names(r, 'featured')).toEqual(['A', 'B']);
    expect(r.title).toBe('Song');
  });
});

describe('parseArtists: edge cases', () => {
  it('flags a trailing marker with no names and leaves the text', () => {
    const t = parseArtists('Drake', 'Song feat.');
    expect(codes(t)).toContain('empty_feat_segment');
    expect(t.title).toBeNull();
    expect(codes(parseArtists('Drake feat.'))).toContain('empty_feat_segment');
    expect(codes(parseArtists('Drake', 'Song (feat. )'))).toContain('empty_feat_segment');
  });

  it('removes duplicates case-insensitively, primary first', () => {
    const r = parseArtists('Drake feat. drake, Rihanna, RIHANNA');
    expect(r.credits.map((c) => `${c.role}:${c.name}`)).toEqual(['primary:Drake', 'featured:Rihanna']);
    expect(codes(r).filter((c) => c === 'duplicate_removed')).toHaveLength(2);
  });

  it('collapses whitespace and handles empty input', () => {
    expect(names(parseArtists('  A   B  '), 'primary')).toEqual(['A B']);
    expect(parseArtists('').credits).toEqual([]);
    expect(parseArtists('   ').credits).toEqual([]);
  });

  it('numbers credits primaries first', () => {
    const r = parseArtists('A feat. B & C');
    expect(r.credits.map((c) => [c.name, c.role, c.order])).toEqual([['A', 'primary', 0], ['B', 'featured', 1], ['C', 'featured', 2]]);
  });
});

const c = (name: string, role: 'primary' | 'featured', order: number) => ({ name, role, order });

describe('formatArtistDisplay', () => {
  it('joins primaries', () => {
    expect(joinNames([])).toBe('');
    expect(formatArtistDisplay([c('A', 'primary', 0)])).toBe('A');
    expect(formatArtistDisplay([c('A', 'primary', 0), c('B', 'primary', 1)])).toBe('A & B');
    expect(formatArtistDisplay([c('A', 'primary', 0), c('B', 'primary', 1), c('C', 'primary', 2)])).toBe('A, B & C');
  });

  it('formats 1, 2 and 3+ featured', () => {
    const p = c('P', 'primary', 0);
    expect(formatArtistDisplay([p, c('A', 'featured', 1)])).toBe('P feat. A');
    expect(formatArtistDisplay([p, c('A', 'featured', 1), c('B', 'featured', 2)])).toBe('P feat. A & B');
    expect(formatArtistDisplay([p, c('A', 'featured', 1), c('B', 'featured', 2), c('C', 'featured', 3)])).toBe('P feat. A, B & C');
  });

  it('combines several primaries with featured, and respects order', () => {
    expect(formatArtistDisplay([c('F', 'featured', 3), c('B', 'primary', 1), c('A', 'primary', 0), c('C', 'primary', 2)]))
      .toBe('A, B & C feat. F');
  });

  it('round-trips through the parser', () => {
    const text = 'A, B & C feat. D, E & F';
    // `&` splits primaries, so the parse is flagged, but the credits rebuild the same string.
    expect(formatArtistDisplay(parseArtists(text).credits)).toBe(text);
  });

  it('adds featured to a title only on request', () => {
    const credits = [c('P', 'primary', 0), c('A', 'featured', 1), c('B', 'featured', 2)];
    expect(formatTitleWithFeatured('Song', credits)).toBe('Song (feat. A & B)');
    expect(formatTitleWithFeatured('Song', [c('P', 'primary', 0)])).toBe('Song');
  });
});

describe('validateArtistCredits', () => {
  const ok = (v: unknown) => validateArtistCredits(v);
  it('accepts an empty list and normalises order, trimming and whitespace', () => {
    expect(ok([])).toEqual({ ok: true, credits: [] });
    expect(ok([{ name: '  A  b ', role: 'featured' }, { name: 'P', role: 'primary' }])).toEqual({
      ok: true,
      credits: [c('P', 'primary', 0), c('A b', 'featured', 1)],
    });
  });

  it.each([
    [{}, 'artists_invalid'],
    [['x'], 'artists_invalid'],
    [[{ name: 'A', role: 'lead' }], 'artist_role_invalid'],
    [[{ name: '   ', role: 'primary' }], 'artist_name_empty'],
    [[{ role: 'primary' }], 'artist_name_empty'],
    [[{ name: 'x'.repeat(ARTIST_LIMITS.maxNameLength + 1), role: 'primary' }], 'artist_name_too_long'],
    [[{ name: 'A', role: 'primary' }, { name: ' a ', role: 'featured' }], 'artist_duplicate'],
    [[{ name: 'A', role: 'featured' }], 'artist_primary_required'],
    [Array.from({ length: ARTIST_LIMITS.maxArtists + 1 }, (_, i) => ({ name: `n${i}`, role: 'primary' })), 'artists_too_many'],
  ])('rejects %j with %s', (input, code) => {
    expect(ok(input)).toMatchObject({ ok: false, code });
  });
});
