import { describe, expect, it } from 'vitest';
import { songLanguageHint } from './song-language';

describe('songLanguageHint', () => {
  it('reads the project metadata songLanguage', () => {
    expect(songLanguageHint({ songLanguage: 'Japanese' })).toBe('Japanese');
  });
  it('is undefined when unset, empty, blank or not a string', () => {
    expect(songLanguageHint(undefined)).toBeUndefined();
    expect(songLanguageHint({})).toBeUndefined();
    expect(songLanguageHint({ songLanguage: '' })).toBeUndefined();
    expect(songLanguageHint({ songLanguage: '  ' })).toBeUndefined();
    expect(songLanguageHint({ songLanguage: 3 })).toBeUndefined();
    expect(songLanguageHint({ language: 'Japanese' })).toBeUndefined();
  });
  it('trims and caps at the server limit of 35 characters', () => {
    expect(songLanguageHint({ songLanguage: ' Korean ' })).toBe('Korean');
    expect(songLanguageHint({ songLanguage: 'x'.repeat(60) })).toHaveLength(35);
  });
});
