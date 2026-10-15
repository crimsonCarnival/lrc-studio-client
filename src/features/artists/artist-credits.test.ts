import { describe, expect, it } from 'vitest';
import {
  artistDisplay, artistFieldsFromForm, artistRoster, creditsEqual, creditsOf, creditsProblem, mergeCredits, renumber, toArtistInput,
} from './artist-credits';

const c = (name: string, role: 'primary' | 'featured', order = 0) => ({ name, role, order });

describe('credits helpers', () => {
  it('lists primaries before featured and numbers them', () => {
    expect(renumber([c('F', 'featured'), c('P', 'primary')])).toEqual([c('P', 'primary', 0), c('F', 'featured', 1)]);
  });

  it('reads credits in order, and is empty for a legacy row', () => {
    expect(creditsOf({ artists: [c('B', 'primary', 1), c('A', 'primary', 0)] }).map((x) => x.name)).toEqual(['A', 'B']);
    expect(creditsOf({ artists: [], songArtist: 'Old text' })).toEqual([]);
  });

  it('displays from the credits, falling back to the stored text only for legacy rows', () => {
    expect(artistDisplay({ artists: [c('Drake', 'primary'), c('Rihanna', 'featured', 1)], songArtist: 'ignored' })).toBe('Drake feat. Rihanna');
    expect(artistDisplay({ artists: [], songArtist: ' Old text ' })).toBe('Old text');
    expect(artistDisplay(null)).toBe('');
  });

  it('makes every credited name a singer choice, primaries first', () => {
    expect(artistRoster({ artists: [c('P', 'primary'), c('F', 'featured', 1)] })).toEqual(['P', 'F']);
    expect(artistRoster({ artists: [], songArtist: 'Old' })).toEqual([]);
  });

  it('writes { name, role } only, in display order', () => {
    expect(toArtistInput([{ ...c('F', 'featured', 0), artistId: 'x' } as never, c('P', 'primary', 1)])).toEqual([
      { name: 'P', role: 'primary' }, { name: 'F', role: 'featured' },
    ]);
  });

  it('merges without duplicates, existing first, case-insensitively', () => {
    const merged = mergeCredits([c('Drake', 'primary')], [c('drake', 'featured'), c('Rihanna', 'featured')]);
    expect(merged.map((x) => [x.name, x.role])).toEqual([['Drake', 'primary'], ['Rihanna', 'featured']]);
  });

  it('compares by name and role, not by order numbers', () => {
    expect(creditsEqual([c('A', 'primary', 5)], [c('A', 'primary', 0)])).toBe(true);
    expect(creditsEqual([c('A', 'primary')], [c('A', 'featured')])).toBe(false);
  });

  it('reports the problem the server would, with the name for a duplicate', () => {
    expect(creditsProblem([])).toBeNull();
    expect(creditsProblem([c('F', 'featured')])?.code).toBe('artist_primary_required');
    expect(creditsProblem([c('A', 'primary'), c('a', 'featured', 1)])).toEqual({ code: 'artist_duplicate', name: 'a' });
    expect(creditsProblem(Array.from({ length: 11 }, (_, i) => c(`A${i}`, 'primary', i)))?.code).toBe('artists_too_many');
    expect(creditsProblem([c('x'.repeat(301), 'primary')])?.code).toBe('artist_name_too_long');
  });

  it('builds the metadata fields after a form: derived text and the dirty flag', () => {
    const fields = artistFieldsFromForm({ artists: [c('P', 'primary'), c('F', 'featured')], artistsChanged: true });
    expect(fields.songArtist).toBe('P feat. F');
    expect(fields.artistsDirty).toBe(true);
    expect(artistFieldsFromForm({ artists: [] }).artistsDirty).toBe(false);
  });
});
