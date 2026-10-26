import { describe, it, expect } from 'vitest';
import { safeRedirectPath } from './safe-redirect';

const ORIGIN = 'https://www.lrcstudio.app';
const check = (raw: string | null) => safeRedirectPath(raw, '/home', ORIGIN);

describe('safeRedirectPath', () => {
  it('keeps in-app paths with their query and hash', () => {
    expect(check('/project/local?fromGuest=1')).toBe('/project/local?fromGuest=1');
    expect(check('/alice/projects/abc#l12')).toBe('/alice/projects/abc#l12');
  });

  it('falls back when nothing is given', () => {
    expect(check(null)).toBe('/home');
    expect(check('')).toBe('/home');
  });

  it.each([
    'https://evil.example/phish',
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example',
    'javascript:alert(1)',
    'data:text/html,hi',
    '/.//evil.example',
    `${ORIGIN}//evil.example`,
    '/./\\/evil.example',
  ])('rejects off-origin target %s', (raw) => {
    expect(check(raw)).toBe('/home');
  });

  it('normalises a same-origin absolute URL to its path', () => {
    expect(check(`${ORIGIN}/explore`)).toBe('/explore');
  });
});
