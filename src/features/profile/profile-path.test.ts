import { describe, expect, it } from 'vitest';
import { listPath, listsPath, profilePath } from './profile-path';

describe('profilePath / listPath', () => {
  it('builds root-level URLs', () => {
    expect(profilePath('32blunts')).toBe('/32blunts');
    expect(listPath('32blunts', 'abc')).toBe('/32blunts/lists/abc');
  });
  it('encodes unusual names', () => {
    expect(profilePath('a b')).toBe('/a%20b');
  });
  it('falls back to home when the name or list id is missing', () => {
    expect(profilePath(undefined)).toBe('/');
    expect(profilePath('')).toBe('/');
    expect(listPath(null, 'abc')).toBe('/');
    expect(listPath('x', undefined)).toBe('/');
  });
});

describe('listsPath', () => {
  it('builds the all-lists URL', () => {
    expect(listsPath('32blunts')).toBe('/32blunts/lists');
    expect(listsPath('a b')).toBe('/a%20b/lists');
  });
  it('falls back to home when the name is missing', () => {
    expect(listsPath(null)).toBe('/');
    expect(listsPath('')).toBe('/');
  });
});
