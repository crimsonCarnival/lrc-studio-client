// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ShelfArtist } from '../shelf.service';

const { getArtistShelf } = vi.hoisted(() => ({ getArtistShelf: vi.fn() }));
vi.mock('../shelf.service', async (importOriginal) => ({ ...(await importOriginal<object>()), getArtistShelf }));

import { ArtistsTab } from './ArtistsTab';

const artist = (over: Partial<ShelfArtist>): ShelfArtist => ({
  id: 'a1', name: 'Luna Vale', isPublic: false, songCount: 3, albumCount: 1,
  coverImage: null, latestEditAt: '2026-01-01T00:00:00.000Z', albums: [], ...over,
});

function wrap(isOwner: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><ArtistsTab accountName="mika" isOwner={isOwner} asVisitor={!isOwner} /></MemoryRouter>
    </QueryClientProvider>,
  );
}

const names = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);

describe('ArtistsTab', () => {
  beforeEach(() => {
    getArtistShelf.mockReset();
    // Radix Select calls these, and jsdom has neither.
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
  });

  it('shows a Private chip only to the owner', async () => {
    getArtistShelf.mockResolvedValue([artist({}), artist({ id: 'a2', name: 'Kaito', isPublic: true })]);
    const owner = wrap(true);
    expect(await screen.findByText('Luna Vale')).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
    owner.unmount();

    wrap(false);
    expect(await screen.findByText('Luna Vale')).toBeInTheDocument();
    expect(screen.queryByText('Private')).not.toBeInTheDocument();
    expect(screen.queryByText('Public')).not.toBeInTheDocument();
  });

  it('filters by search and sorts A–Z', async () => {
    getArtistShelf.mockResolvedValue([
      artist({ id: 'a1', name: 'Zed', songCount: 9 }),
      artist({ id: 'a2', name: 'Abel', songCount: 1 }),
      artist({ id: 'a3', name: 'Mika', songCount: 5 }),
    ]);
    wrap(true);
    await screen.findByText('Zed');
    // Default: most songs first.
    expect(names()).toEqual(['Zed', 'Mika', 'Abel']);

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('option', { name: 'A–Z' }));
    expect(names()).toEqual(['Abel', 'Mika', 'Zed']);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'mi' } });
    expect(names()).toEqual(['Mika']);
  });
});
