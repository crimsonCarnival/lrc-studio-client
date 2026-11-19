// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { getCatalogArtist } = vi.hoisted(() => ({ getCatalogArtist: vi.fn() }));
vi.mock('./catalog.service', async (importOriginal) => ({ ...(await importOriginal<object>()), getCatalogArtist }));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: null }) }));

import CatalogArtistPage from './CatalogArtistPage';

const artist = { id: 'a1', slug: 'ada', name: 'Ada', imageUrl: 'https://res.cloudinary.com/x/a.jpg', bio: null, disambiguation: null };

function renderPage(overrides: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  getCatalogArtist.mockResolvedValue({ artist: { ...artist, ...overrides }, albums: [], albumCards: [], songs: [], ...extra });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/artists/ada']}>
        <Routes><Route path="/artists/:slug" element={<CatalogArtistPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CatalogArtistPage photo credit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a Genius credit linking imageSourceUrl', async () => {
    renderPage({ imageSource: 'genius', imageSourceUrl: 'https://genius.com/artists/Ada' });
    const link = await screen.findByRole('link', { name: /genius/i });
    expect(link).toHaveAttribute('href', 'https://genius.com/artists/Ada');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow');
  });

  it('no credit for uploaded or missing photos', async () => {
    renderPage({ imageSource: 'upload', imageSourceUrl: null });
    await screen.findByRole('heading', { name: 'Ada' });
    expect(screen.queryByRole('link', { name: /genius/i })).toBeNull();
  });

  it('no link for a non-genius.com source URL', async () => {
    renderPage({ imageSource: 'genius', imageSourceUrl: 'https://evil.example/genius.com/' });
    await screen.findByRole('heading', { name: 'Ada' });
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('CatalogArtistPage albums', () => {
  beforeEach(() => vi.clearAllMocks());

  const card = (title: string, slug: string | null, year: string | null, songCount: number) =>
    ({ album: { id: `id-${title}`, artistId: 'a1', title, slug, year, coverUrl: null }, songCount, coverUrl: null });

  it('shows only the server album cards, newest first, linked to their album page', async () => {
    renderPage({}, {
      albumCards: [card('Old', 'old', '1999', 2), card('New', 'new', '2020', 0)],
      // A song naming an uncatalogued album must not become a card.
      songs: [{ id: 's1', title: 'S', metadata: { songName: 'S', songAlbum: 'Bootleg' } }],
    });
    const links = await screen.findAllByRole('link', { name: /Old|New/ });
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/artists/ada/albums/new', '/artists/ada/albums/old']);
    expect(screen.queryByRole('link', { name: /Bootleg/ })).toBeNull();
    expect(screen.getAllByText('Bootleg')).toHaveLength(1); // only under the song row
  });

  it('renders a slugless album without a link', async () => {
    renderPage({}, { albumCards: [card('Loose', null, null, 0)] });
    await screen.findByText('Loose');
    expect(screen.queryByRole('link', { name: /Loose/ })).toBeNull();
  });
});
