import { describe, it, expect, vi } from 'vitest';

const gqlRequest = vi.fn().mockResolvedValue({ updateSettings: {} });
vi.mock('@/app/graphql.client', () => ({ gqlRequest: (...a: unknown[]) => gqlRequest(...a) }));

import { settingsService } from './settings.service';
import { pushSettingsChanges } from '../settings-merge';

describe('settingsService.patch', () => {
  // SettingsContext hands `settingsApi.patch` to pushSettingsChanges as a bare function, so the
  // method must not depend on `this`.
  it('works when called detached from the service', async () => {
    const { patch } = settingsService;
    await expect(patch({ interface: { theme: 'light' } })).resolves.not.toThrow();
    expect(gqlRequest).toHaveBeenCalledWith(expect.any(String), { input: { interface: { theme: 'light' } } });
  });

  it('pushSettingsChanges reports no failure for a plain theme change', async () => {
    const changes = { interface: { theme: 'light' } };
    const result = await pushSettingsChanges(changes, changes, {}, settingsService.patch);
    expect(result.failed).toEqual([]);
  });
});
