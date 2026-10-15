import { describe, expect, it } from 'vitest';
import { normalizeMetadata } from './projects.service';

const credit = (name: string, role: 'primary' | 'featured', order = 0) => ({ name, role, order, artistId: 'abc' });

describe('normalizeMetadata (what a save sends)', () => {
  it('never sends songArtist or songArtists: the server no longer accepts them', () => {
    const out = normalizeMetadata({ songName: 'Creep', songArtist: 'Radiohead', songArtists: ['Radiohead'], artists: [credit('Radiohead', 'primary')] });
    expect(out).not.toHaveProperty('songArtist');
    expect(out).not.toHaveProperty('songArtists');
    expect(out).toHaveProperty('songName', 'Creep');
  });

  it('sends credits as { name, role } in display order, without artistId or order', () => {
    const out = normalizeMetadata({ artists: [credit('Rihanna', 'featured', 1), credit('Drake', 'primary', 0)] });
    expect(out).toEqual({ artists: [{ name: 'Drake', role: 'primary' }, { name: 'Rihanna', role: 'featured' }] });
  });

  it('omits artists for a legacy row that was not edited, so the stored credits are kept', () => {
    const out = normalizeMetadata({ songName: 'Creep', songArtist: 'Old text', artists: [] });
    expect(out).toEqual({ songName: 'Creep' });
    expect(out).not.toHaveProperty('artists');
  });

  it('omits artists when the metadata has none at all (a save that never touched them)', () => {
    expect(normalizeMetadata({ description: 'x' })).toEqual({ description: 'x' });
  });

  it('sends [] only when the credits were edited down to nothing: that clears them', () => {
    expect(normalizeMetadata({ artists: [], artistsDirty: true })).toEqual({ artists: [] });
  });

  it('never leaks the dirty flag', () => {
    expect(normalizeMetadata({ artists: [credit('A', 'primary')], artistsDirty: true })).not.toHaveProperty('artistsDirty');
    expect(normalizeMetadata({ artists: [credit('A', 'primary')], artistsDirty: false })).not.toHaveProperty('artistsDirty');
  });

  it('passes null and undefined through', () => {
    expect(normalizeMetadata(null)).toBeNull();
    expect(normalizeMetadata(undefined)).toBeUndefined();
  });
});
