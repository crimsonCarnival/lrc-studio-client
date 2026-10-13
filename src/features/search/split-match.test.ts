import { describe, expect, it } from 'vitest';
import { splitMatch } from './split-match';

describe('splitMatch', () => {
  it('splits around a case-insensitive match and keeps the original casing', () => {
    expect(splitMatch('Pancakes at 3 AM', 'pan')).toEqual(['', 'Pan', 'cakes at 3 AM']);
    expect(splitMatch('Everybody Wants', 'BODY')).toEqual(['Every', 'body', ' Wants']);
  });

  it('matches only the first occurrence', () => {
    expect(splitMatch('banana', 'an')).toEqual(['b', 'an', 'ana']);
  });

  it('ignores surrounding whitespace in the query', () => {
    expect(splitMatch('pancho', '  cho ')).toEqual(['pan', 'cho', '']);
  });

  it('returns null for a blank query or no match', () => {
    expect(splitMatch('pancho', '   ')).toBeNull();
    expect(splitMatch('pancho', 'xyz')).toBeNull();
  });
});
