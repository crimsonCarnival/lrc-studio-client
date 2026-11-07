import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// useAuth is too wired to mount here; what matters is that every place that removes the guest
// draft on sign-in / sign-out also removes the rejected-draft backup, so it cannot outlive the
// person on a shared device.
describe('useAuth removes the rejected-draft backup wherever it removes the draft', () => {
  const src = readFileSync('src/features/auth/hooks/useAuth.ts', 'utf8');
  const sites = [...src.matchAll(/storage\.remove\(STORAGE_KEYS\.PROJECT\);/g)];

  it('has the four sign-in/sign-out sites (logout, stale data on restore, login, removeStorageKeys)', () => {
    expect(sites).toHaveLength(4);
  });

  it.each(sites.map((m, i) => [i, m.index!] as const))('site %i is followed by clearRejectedGuestDraft()', (_i, at) => {
    expect(src.slice(at, at + 200)).toContain('clearRejectedGuestDraft();');
  });
});
