// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { localizeSongLanguage } from './song-language';

describe('localizeSongLanguage', () => {
  it('translates a name stored in one UI language into the viewer\'s', () => {
    expect(localizeSongLanguage('English', 'es').toLowerCase()).toBe('inglés');
    expect(localizeSongLanguage('Inglés', 'en')).toBe('English');
    expect(localizeSongLanguage('Japonés', 'en')).toBe('Japanese');
  });

  it('is case-insensitive and accepts a native name or a code', () => {
    expect(localizeSongLanguage('english', 'en')).toBe('English');
    expect(localizeSongLanguage('español', 'en')).toBe('Spanish');
    expect(localizeSongLanguage('ja', 'en')).toBe('Japanese');
  });

  it('keeps a custom value it cannot recognise as typed', () => {
    expect(localizeSongLanguage('Spanglish', 'en')).toBe('Spanglish');
    expect(localizeSongLanguage('  ', 'en')).toBe('');
  });
});
