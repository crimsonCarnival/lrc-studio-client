// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

type Row = { id: string; name: string; isPublic: boolean; listed?: boolean };
const OWN: Row[] = [
  { id: 'p1', name: 'Gym', isPublic: false },
  { id: 'p2', name: 'Roadtrip', isPublic: false },
  { id: 'u1', name: 'By link', isPublic: true, listed: false },
  { id: 'pub1', name: 'Showcase', isPublic: true, listed: true },
  { id: 'pub2', name: 'Old public', isPublic: true },
];
const SAVED: Row[] = [{ id: 's1', name: 'Theirs', isPublic: true }];

const { getPlaylistsPage, getSavedPlaylistsPage } = vi.hoisted(() => ({ getPlaylistsPage: vi.fn(), getSavedPlaylistsPage: vi.fn() }));
vi.mock('@/features/playlists/playlist.service', async (importOriginal) => ({
  ...(await importOriginal<object>()), getPlaylistsPage, getSavedPlaylistsPage,
}));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: { accountName: 'mika' } }) }));
vi.mock('@/features/playlists/PlaylistTile', () => ({
  PlaylistTile: ({ playlist }: { playlist: Row }) => <div data-testid="tile">{playlist.name}</div>,
  PlaylistTileSkeleton: () => null,
}));

import LibraryPlaylists from './LibraryPlaylists';

const matches = (r: Row, visibility?: string | null) =>
  !visibility || visibility === 'ALL'
  || (visibility === 'PRIVATE' && !r.isPublic)
  || (visibility === 'UNLISTED' && r.isPublic && r.listed === false)
  || (visibility === 'PUBLIC' && r.isPublic && r.listed !== false);

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><LibraryPlaylists /></MemoryRouter>
    </QueryClientProvider>,
  );
}

const chipCount = (name: RegExp) => within(screen.getByRole('button', { name })).getByText(/^\d+$/).textContent;

describe('LibraryPlaylists', () => {
  beforeEach(() => {
    getPlaylistsPage.mockReset().mockImplementation(async (_acct: string, p: { visibility?: string; limit?: number }) => {
      const rows = OWN.filter((r) => matches(r, p.visibility));
      return { playlists: rows.slice(0, p.limit ?? 12), total: rows.length, hasMore: false };
    });
    getSavedPlaylistsPage.mockReset().mockResolvedValue({ playlists: SAVED, total: SAVED.length, hasMore: false });
  });

  it('counts private, unlisted and public correctly', async () => {
    mount();
    expect(await screen.findByText('Gym')).toBeInTheDocument();
    await waitFor(() => expect(chipCount(/^Saved from others/)).toBe('1'));
    expect(chipCount(/^All/)).toBe('5');
    expect(chipCount(/^Private/)).toBe('2');
    expect(chipCount(/^Unlisted/)).toBe('1');
    // A public list with `listed` unset still counts as listed.
    expect(chipCount(/^Public/)).toBe('2');
  });
});
