import { describe, expect, it } from 'vitest';
import { artistPath } from './shelf-path';

describe('artistPath', () => {
  it('builds /:account/artists/:id and falls back to /', () => {
    expect(artistPath('mika', 'a1')).toBe('/mika/artists/a1');
    expect(artistPath('a b', 'x/y')).toBe('/a%20b/artists/x%2Fy');
    expect(artistPath(null, 'a1')).toBe('/');
    expect(artistPath(undefined, 'a1')).toBe('/');
    expect(artistPath('', 'a1')).toBe('/');
  });
});
