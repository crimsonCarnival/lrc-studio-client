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

function wrap(isOwner: boolean, isVerified = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><ArtistsTab accountName="mika" isOwner={isOwner} asVisitor={!isOwner} isVerified={isVerified} /></MemoryRouter>
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

  it('reads Singles only when the artist has no real albums, and counts albums otherwise', async () => {
    getArtistShelf.mockResolvedValue([
      artist({ id: 's', name: 'Solo', albumCount: 0 }),
      artist({ id: 'm', name: 'Many', albumCount: 2 }),
    ]);
    wrap(true);
    expect(await screen.findByText('Singles only')).toBeInTheDocument();
    expect(screen.getByText('2 albums')).toBeInTheDocument();
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

  describe('catalog suggestions', () => {
    beforeEach(() => getArtistShelf.mockResolvedValue([artist({})]));

    it('lets a verified owner open the suggest dialog and shows My submissions', async () => {
      wrap(true);
      const suggest = await screen.findByRole('button', { name: 'Suggest an artist' });
      expect(screen.getByRole('button', { name: /My submissions/ })).toBeInTheDocument();
      fireEvent.click(suggest);
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    it('disables the button with a visible hint for an unverified owner', async () => {
      wrap(true, false);
      const button = await screen.findByRole('button', { name: 'Suggest an artist' });
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAccessibleDescription('Verify your email to suggest artists.');
      fireEvent.click(button);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows neither the button nor My submissions to visitors', async () => {
      wrap(false);
      await screen.findByText('Luna Vale');
      expect(screen.queryByRole('button', { name: 'Suggest an artist' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /My submissions/ })).not.toBeInTheDocument();
    });
  });
});
