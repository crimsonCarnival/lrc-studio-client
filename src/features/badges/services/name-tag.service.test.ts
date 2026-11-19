import { beforeEach, describe, expect, it, vi } from 'vitest';

const { gqlRequest, profileChanged } = vi.hoisted(() => ({ gqlRequest: vi.fn(), profileChanged: vi.fn() }));
vi.mock('@/app/graphql.client', () => ({ gqlRequest }));
vi.mock('@/app/cache-sync', () => ({ profileChanged }));

import { setNameTag } from './name-tag.service';

beforeEach(() => { gqlRequest.mockReset(); profileChanged.mockReset(); });

describe('setNameTag', () => {
  it('refreshes cached profiles and feed once the save succeeded', async () => {
    gqlRequest.mockResolvedValue({ setNameTag: true });
    await setNameTag('og');
    expect(gqlRequest).toHaveBeenCalledWith(expect.any(String), { badgeId: 'og' });
    expect(profileChanged).toHaveBeenCalledTimes(1);
  });

  it('leaves the cache alone when the save fails', async () => {
    gqlRequest.mockRejectedValue(new Error('boom'));
    await expect(setNameTag(null)).rejects.toThrow('boom');
    expect(profileChanged).not.toHaveBeenCalled();
  });
});
