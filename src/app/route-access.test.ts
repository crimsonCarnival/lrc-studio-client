import { describe, expect, it } from 'vitest'
import { accessFor } from './route-access'

describe('accessFor', () => {
  it('keeps profiles, lists and project pages at the root public', () => {
    expect(accessFor('/32blunts')).toBe('public');
    expect(accessFor('/32blunts/lists/abc')).toBe('public');
    expect(accessFor('/32blunts/projects/radiohead-creep-k3x9a2c7qm')).toBe('public');
  });
  it('keeps the vanity profile and list URLs public so they can redirect', () => {
    expect(accessFor('/profile/32blunts')).toBe('public');
    expect(accessFor('/profile/32blunts/lists/abc')).toBe('public');
    expect(accessFor('/u/32blunts')).toBe('public');
  });
  it('no longer knows the removed /project/:id URL', () => {
    // It was deleted outright rather than redirected, so route-access has no
    // rule naming it and it falls through to the default like any other
    // unknown path. Guests reaching an old link are sent to sign-in rather
    // than shown a 404 — the cost of keeping no reference to the old shape.
    expect(accessFor('/project/k3x9a2c7qm')).toBe('auth');
  });
  it('requires auth for editors and private areas', () => {
    expect(accessFor('/32blunts/projects/radiohead-creep-k3x9a2c7qm/edit')).toBe('auth');
    expect(accessFor('/library')).toBe('auth');
    expect(accessFor('/settings/profile')).toBe('auth');
  });

  it('keeps profiles and project pages public for accounts with capitals, dots or non-Latin letters', () => {
    for (const name of ['Gburpy', 'Some.User', 'user_Name', 'ユーザー', 'a%20b']) {
      expect(accessFor(`/${name}`)).toBe('public');
      expect(accessFor(`/${name}/lists/abc`)).toBe('public');
      expect(accessFor(`/${name}/projects/radiohead-creep-E46boTClMr`)).toBe('public');
      expect(accessFor(`/${name}/projects/radiohead-creep-E46boTClMr/edit`)).toBe('auth');
    }
  });

  it('accepts a trailing slash and the id-only project form', () => {
    expect(accessFor('/gburpy/projects/E46boTClMr')).toBe('public');
    expect(accessFor('/gburpy/projects/radiohead-creep-E46boTClMr/')).toBe('public');
    expect(accessFor('/gburpy/')).toBe('public');
    expect(accessFor('/gburpy/projects/radiohead-creep-E46boTClMr/edit/')).toBe('auth');
  });

  it('does not make private areas public by being more permissive', () => {
    for (const path of ['/library', '/home', '/settings', '/settings/profile', '/uploads', '/uploads/abc', '/feed', '/notifications', '/reports', '/library/lists/x', '/admin', '/admin/users']) {
      expect(accessFor(path)).not.toBe('public');
    }
  });
});
