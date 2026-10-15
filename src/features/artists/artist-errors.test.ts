import { describe, expect, it } from 'vitest';
import i18n from 'i18next';
import '@/app/i18n';
import { ARTIST_ERROR_CODES, artistErrorCodeOf, artistErrorMessage, artistErrorMessageFor, errorCodeOf } from './artist-errors';

describe('error codes', () => {
  it('reads the code from a GraphQL error, a REST body or the error itself', () => {
    expect(errorCodeOf({ graphqlErrors: [{ extensions: { code: 'artist_duplicate' } }] })).toBe('artist_duplicate');
    expect(errorCodeOf({ body: { code: 'artists_too_many' }, code: 'A song can have at most 10 artists' })).toBe('artists_too_many');
    expect(errorCodeOf({ code: 'artist_name_empty' })).toBe('artist_name_empty');
    expect(errorCodeOf(null)).toBeUndefined();
  });

  it('recognises only the artist and identity codes', () => {
    expect(artistErrorCodeOf({ code: 'artist_primary_required' })).toBe('artist_primary_required');
    expect(artistErrorCodeOf({ code: 'project_identity_required' })).toBe('project_identity_required');
    expect(artistErrorCodeOf({ code: 'sudo_required' })).toBeNull();
  });
});

describe('localised messages', () => {
  it.each(['en', 'es'])('has a message for every code in %s, never a raw key', async (lng) => {
    await i18n.changeLanguage(lng);
    for (const code of ARTIST_ERROR_CODES) {
      const message = artistErrorMessage(i18n.t, code, { name: 'X', max: 10 });
      expect(message).not.toMatch(/^artists\./);
      expect(message.length).toBeGreaterThan(5);
    }
  });

  it('fills the name and the limit', async () => {
    await i18n.changeLanguage('en');
    expect(artistErrorMessage(i18n.t, 'artist_duplicate', { name: 'Drake' })).toBe('“Drake” is listed more than once.');
    expect(artistErrorMessage(i18n.t, 'artists_too_many', { max: 10 })).toBe('A song can have at most 10 artists.');
    await i18n.changeLanguage('es');
    expect(artistErrorMessage(i18n.t, 'artist_primary_required')).toBe('Añade al menos un artista principal.');
  });

  it('returns null for any other failure so the caller shows its own message', () => {
    expect(artistErrorMessageFor(i18n.t, { code: 'network' })).toBeNull();
    expect(artistErrorMessageFor(i18n.t, new Error('boom'))).toBeNull();
  });
});
