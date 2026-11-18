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

function renderPage(overrides: Record<string, unknown>) {
  getCatalogArtist.mockResolvedValue({ artist: { ...artist, ...overrides }, albums: [], songs: [] });
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
