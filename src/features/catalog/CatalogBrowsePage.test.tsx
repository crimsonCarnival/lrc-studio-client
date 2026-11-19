// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import '@/app/i18n';

const { browseCatalogArtists } = vi.hoisted(() => ({ browseCatalogArtists: vi.fn() }));
vi.mock('./catalog.service', async (importOriginal) => ({ ...(await importOriginal<object>()), browseCatalogArtists }));

import CatalogBrowsePage from './CatalogBrowsePage';

const artist = (n: number, extra: Record<string, unknown> = {}) => ({ id: `a${n}`, name: `Artist ${n}`, slug: `artist-${n}`, disambiguation: '', imageUrl: null, ...extra });

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><CatalogBrowsePage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CatalogBrowsePage', () => {
  beforeEach(() => browseCatalogArtists.mockReset());

  it('lists artists with links, the total, and loads the next page from the loaded count', async () => {
    browseCatalogArtists
      .mockResolvedValueOnce({ items: [artist(1, { disambiguation: 'UK band' }), artist(2)], total: 3 })
      .mockResolvedValueOnce({ items: [artist(3)], total: 3 });
    renderPage();
    expect(await screen.findByRole('link', { name: /Artist 1/ })).toHaveAttribute('href', '/artists/artist-1');
    expect(screen.getByText('UK band')).toBeInTheDocument();
    expect(screen.getByText('3 artists')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByRole('link', { name: /Artist 3/ })).toBeInTheDocument();
    expect(browseCatalogArtists).toHaveBeenLastCalledWith('', 2);
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });

  it('searches after a pause and says when nothing matches', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    browseCatalogArtists.mockResolvedValueOnce({ items: [artist(1)], total: 1 }).mockResolvedValueOnce({ items: [], total: 0 });
    renderPage();
    await screen.findByRole('link', { name: /Artist 1/ });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search artists' }), { target: { value: ' zz ' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(await screen.findByText('No artists match “zz”.')).toBeInTheDocument();
    expect(browseCatalogArtists).toHaveBeenLastCalledWith('zz', 0);
    vi.useRealTimers();
  });

  it('offers a retry when loading fails', async () => {
    browseCatalogArtists.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce({ items: [artist(1)], total: 1 });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: /Artist 1/ })).toBeInTheDocument();
  });
});
