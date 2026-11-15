// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ShelfArtist, ShelfProject } from '@/features/artists/shelf.service';

// The metadata a shelf track carries, same shape as a Library list row.
const FULL: ShelfProject = {
  id: 'p1',
  publicId: 'pub1',
  title: 'Stronger',
  lineCount: 10,
  syncedLineCount: 4,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  metadata: {
    songName: 'Stronger',
    songAlbum: 'Graduation',
    description: 'Daft Punk sample',
    songYear: '2007',
    songLanguage: 'en',
    trackNumber: 3,
    trackCount: 14,
    singers: ['Kanye'],
    singerColors: ['rose'],
    artists: [{ name: 'Kanye West', role: 'primary', order: 0 }],
  },
};
const SHELF: ShelfArtist[] = [{
  id: 'a1', name: 'Kanye West', isPublic: true, songCount: 1, albumCount: 1, coverImage: null, latestEditAt: '2026-01-01T00:00:00Z',
  albums: [{ key: 'graduation', title: 'Graduation', year: '2007', isPublic: true, trackCount: 1, coverImage: null, tracks: [{ project: FULL, trackNumber: 3 }] }],
}] as ShelfArtist[];

const { patch, list } = vi.hoisted(() => ({ patch: vi.fn(), list: vi.fn() }));
vi.mock('@/app/api', () => ({
  projects: { list, patch, remove: vi.fn() },
}));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: { accountName: 'mika' } }) }));
vi.mock('@/features/settings/useSettings', () => ({ useSettings: () => ({ settings: {} }) }));
vi.mock('@/shared/hooks/useInputMethod', () => ({ default: () => 'mouse' }));
vi.mock('@/features/artists/shelf.queries', () => ({
  useArtistShelf: () => ({ data: SHELF, isPending: false, isError: false, refetch: vi.fn() }),
}));
// Radix select is awkward in jsdom; a native select keeps the same contract.
vi.mock('@ui/select-field', () => ({
  SelectField: ({ value, onValueChange, options, 'aria-label': label }: {
    value: string; onValueChange: (v: string) => void; options: { value: string; label: string }[]; 'aria-label': string;
  }) => (
    <select aria-label={label} value={value} onChange={(e) => onValueChange(e.target.value)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ),
}));
// The real modal seeds its form from the initial* props and hands them back on confirm; this stub does the same.
vi.mock('@features/editor/components/setup/ProjectSetupModal', () => ({
  default: (p: Record<string, unknown> & { onConfirm: (d: Record<string, unknown>) => void }) => (
    <button
      onClick={() => p.onConfirm({
        name: p.initialName,
        description: p.initialDescription,
        tags: p.initialTags,
        songName: p.initialSongName,
        artists: p.initialArtists,
        songAlbum: p.initialSongAlbum,
        songYear: p.initialSongYear,
        genre: p.initialGenre,
        singers: p.initialSingers,
        singerColors: p.initialSingerColors,
      })}
    >
      save-metadata
    </button>
  ),
}));

import Library from './Library';

describe('Library artist view', () => {
  beforeEach(() => {
    patch.mockReset().mockResolvedValue({});
    // The loaded list is what makes the filter row (and the sort select) render.
    list.mockReset().mockResolvedValue([FULL]);
  });

  it('editing from the artist view keeps description, year, singers and track info', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter><Library /></MemoryRouter>
      </QueryClientProvider>,
    );
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByRole('combobox', { name: /sort by/i }), 'artist');
    await user.click(await screen.findByRole('button', { name: 'Edit Metadata' }));
    await user.click(screen.getByText('save-metadata'));

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch.mock.calls[0][1].metadata).toMatchObject({
      description: 'Daft Punk sample',
      songYear: '2007',
      songLanguage: 'en',
      trackNumber: 3,
      trackCount: 14,
      singers: ['Kanye'],
      singerColors: ['rose'],
    });
  });
});
