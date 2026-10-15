import { describe, expect, it } from 'vitest';
import { accessFor } from './route-access';

describe('accessFor', () => {
  it('keeps profiles, lists and project pages at the root public', () => {
    expect(accessFor('/32blunts')).toBe('public');
    expect(accessFor('/32blunts/lists/abc')).toBe('public');
    expect(accessFor('/32blunts/projects/radiohead-creep-k3x9a2c7qm')).toBe('public');
  });
  it('keeps legacy profile and project URLs public so they can redirect', () => {
    expect(accessFor('/profile/32blunts')).toBe('public');
    expect(accessFor('/profile/32blunts/lists/abc')).toBe('public');
    expect(accessFor('/u/32blunts')).toBe('public');
    expect(accessFor('/project/k3x9a2c7qm')).toBe('public');
  });
  it('requires auth for editors and private areas', () => {
    expect(accessFor('/32blunts/projects/radiohead-creep-k3x9a2c7qm/edit')).toBe('auth');
    expect(accessFor('/project/k3x9a2c7qm/edit')).toBe('auth');
    expect(accessFor('/library')).toBe('auth');
    expect(accessFor('/settings/profile')).toBe('auth');
  });
});
