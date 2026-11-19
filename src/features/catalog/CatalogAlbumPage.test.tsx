// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { getCatalogAlbum } = vi.hoisted(() => ({ getCatalogAlbum: vi.fn() }));
vi.mock('@/app/NotFoundPage', () => ({ default: () => <p>not-found</p> }));
vi.mock('./catalog.service', async (importOriginal) => ({ ...(await importOriginal<object>()), getCatalogAlbum }));

import CatalogAlbumPage from './CatalogAlbumPage';

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/artists/:slug/albums/:albumSlug" element={<CatalogAlbumPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CatalogAlbumPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks for both slugs and links back to the artist', async () => {
    getCatalogAlbum.mockResolvedValue({
      artist: { id: 'a1', slug: 'robyn', name: 'Robyn' },
      album: { id: 'b1', artistId: 'a1', title: 'Honey', slug: 'honey', year: '2018', coverUrl: null },
      coverUrl: null,
      songs: [{ id: 's1', title: 'Missing U', metadata: { songName: 'Missing U', trackNumber: 1 } }],
    });
    renderAt('/artists/robyn/albums/honey');
    expect(await screen.findByRole('heading', { name: 'Honey' })).toBeInTheDocument();
    expect(getCatalogAlbum).toHaveBeenCalledWith('robyn', 'honey');
    for (const link of screen.getAllByRole('link', { name: /Robyn/ })) expect(link).toHaveAttribute('href', '/artists/robyn');
    expect(screen.getByText('Missing U')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows the not-found page when the album does not exist', async () => {
    getCatalogAlbum.mockResolvedValue(null);
    renderAt('/artists/robyn/albums/nope');
    expect(await screen.findByText('not-found')).toBeInTheDocument();
  });
});
