// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ShelfArtist } from '../shelf.service';

const { getShelfArtist, setShelfVisibility, createPlaylist, toast, auth } = vi.hoisted(() => ({
  getShelfArtist: vi.fn(),
  setShelfVisibility: vi.fn(),
  createPlaylist: vi.fn(),
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  auth: { user: { accountName: 'mika' } as { accountName: string } | null },
}));
vi.mock('../shelf.service', async (importOriginal) => ({ ...(await importOriginal<object>()), getShelfArtist, setShelfVisibility }));
vi.mock('@/features/playlists/playlist.service', async (importOriginal) => ({ ...(await importOriginal<object>()), createPlaylist }));
vi.mock('react-hot-toast', () => ({ default: toast, toast }));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => auth }));

import ArtistPage from './ArtistPage';

const track = (publicId: string, n: number) => ({
  trackNumber: n,
  project: { id: `id-${publicId}`, publicId, title: publicId, kind: 'song' as const },
});

const artist = (): ShelfArtist => ({
  id: 'a1', name: 'Luna Vale', isPublic: false, songCount: 4, albumCount: 2,
  coverImage: null, latestEditAt: '2026-01-01T00:00:00.000Z',
  albums: [
    { key: 'dawn', title: 'Dawn', year: '2020', isPublic: false, trackCount: 2, coverImage: null, tracks: [track('p2', 2), track('p1', 1)] },
    { key: '', title: '', year: null, isPublic: false, trackCount: 1, coverImage: null, tracks: [track('p3', 1)] },
  ],
});

function wrap(url = '/mika/artists/a1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes><Route path="/:accountName/artists/:artistId" element={<ArtistPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}

describe('ArtistPage owner controls', () => {
  beforeEach(() => {
    getShelfArtist.mockReset().mockResolvedValue(artist());
    setShelfVisibility.mockReset().mockResolvedValue(undefined);
    createPlaylist.mockReset().mockResolvedValue({ id: 'pl1' });
    toast.success.mockReset();
    toast.error.mockReset();
    auth.user = { accountName: 'mika' };
  });

  it('toggling Public calls setShelfVisibility(artistId, null, true)', async () => {
    wrap();
    await screen.findByRole('heading', { level: 1, name: 'Luna Vale' });
    const group = screen.getByRole('radiogroup', { name: 'Visibility' });
    expect(group).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Public' }));
    await waitFor(() => expect(setShelfVisibility).toHaveBeenCalledWith('a1', null, true));
    expect(screen.getByRole('radio', { name: 'Public' })).toBeChecked();
  });

  it('failed toggle rolls back and toasts', async () => {
    setShelfVisibility.mockRejectedValue(new Error('boom'));
    wrap();
    await screen.findByRole('heading', { level: 1, name: 'Luna Vale' });
    fireEvent.click(screen.getByRole('radio', { name: 'Public' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't change visibility. Try again."));
    expect(screen.getByRole('radio', { name: 'Private' })).toBeChecked();
  });

  it('album menu sends the album key as received, including the singles bucket', async () => {
    wrap();
    await screen.findByRole('heading', { level: 1, name: 'Luna Vale' });
    const menus = screen.getAllByRole('button', { name: 'More actions' });
    fireEvent.keyDown(menus[1], { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: /Make public/ }));
    await waitFor(() => expect(setShelfVisibility).toHaveBeenCalledWith('a1', '', true));
  });

  it('Save album as playlist calls createPlaylist with the album publicIds in order and isPublic false', async () => {
    wrap();
    await screen.findByRole('heading', { level: 1, name: 'Luna Vale' });
    fireEvent.keyDown(screen.getAllByRole('button', { name: 'More actions' })[0], { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: /Save album as playlist/ }));
    await waitFor(() => expect(createPlaylist).toHaveBeenCalledWith({ name: 'Luna Vale — Dawn', publicIds: ['p2', 'p1'], isPublic: false }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it('header Save as playlist uses every track in display order', async () => {
    wrap();
    await screen.findByRole('heading', { level: 1, name: 'Luna Vale' });
    fireEvent.click(screen.getByRole('button', { name: /^\W*Save as playlist$/ }));
    await waitFor(() => expect(createPlaylist).toHaveBeenCalledWith({ name: 'Luna Vale', publicIds: ['p2', 'p1', 'p3'], isPublic: false }));
  });

  it('visitors see no visibility controls', async () => {
    auth.user = { accountName: 'someone' };
    wrap();
    await screen.findByRole('heading', { level: 1, name: 'Luna Vale' });
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More actions' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^\W*Save as playlist$/ })).not.toBeInTheDocument();
  });

  it('view as others hides every control', async () => {
    wrap('/mika/artists/a1?view=public');
    await screen.findByRole('heading', { level: 1, name: 'Luna Vale' });
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More actions' })).not.toBeInTheDocument();
  });
});
