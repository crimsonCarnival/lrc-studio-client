import { describe, expect, it, vi } from 'vitest';

const { gqlRequest } = vi.hoisted(() => ({ gqlRequest: vi.fn() }));
vi.mock('@/app/graphql.client', () => ({ gqlRequest }));

import { getArtistShelf } from './shelf.service';
import { PROJECT_LIST_FIELDS } from '@/features/projects/services/projects.service';

describe('shelf query', () => {
  it('selects tracks with the same ProjectListFields as the Library list, so editing one never drops metadata', async () => {
    gqlRequest.mockResolvedValue({ artistShelf: [] });
    await getArtistShelf('mika', { withTracks: true });
    const query = gqlRequest.mock.calls[0][0] as string;
    expect(query).toContain('project { ...ProjectListFields');
    expect(query).toContain(PROJECT_LIST_FIELDS);
    for (const field of ['description', 'songYear', 'songLanguage', 'trackNumber', 'trackCount', 'singers', 'singerColors', 'forkedFrom']) {
      expect(PROJECT_LIST_FIELDS).toContain(field);
    }
  });
});
