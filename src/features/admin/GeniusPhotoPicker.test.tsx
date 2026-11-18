// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const { searchGeniusArtists, copyGeniusPhoto } = vi.hoisted(() => ({ searchGeniusArtists: vi.fn(), copyGeniusPhoto: vi.fn() }));
vi.mock('@/features/catalog/catalog.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  searchGeniusArtists,
  copyGeniusPhoto,
}));

import { GeniusPhotoPicker } from './GeniusPhotoPicker';

const matches = [
  { geniusId: 11, name: 'Luna Vale', imageUrl: 'https://images.genius.com/a.jpg', url: 'https://genius.com/artists/Luna-vale' },
  { geniusId: 22, name: 'Luna Vales', imageUrl: 'https://images.genius.com/b.jpg', url: 'https://genius.com/artists/Luna-vales' },
];

function show(props: Partial<{ onPick: () => void; onClose: () => void }> = {}) {
  const onPick = props.onPick ?? vi.fn();
  const onClose = props.onClose ?? vi.fn();
  render(<GeniusPhotoPicker open initialQuery="Luna" onPick={onPick} onClose={onClose} />);
  return { onPick, onClose };
}

describe('GeniusPhotoPicker', () => {
  beforeEach(() => vi.clearAllMocks());

  it('searches the initial query on open and lists matches', async () => {
    searchGeniusArtists.mockResolvedValue(matches);
    show();
    expect(await screen.findByText('Luna Vale')).toBeInTheDocument();
    expect(searchGeniusArtists).toHaveBeenCalledWith('Luna');
    expect(screen.getAllByRole('button', { name: 'Use this photo' })).toHaveLength(2);
    const img = screen.getAllByRole('img')[0];
    expect(img).toHaveAttribute('src', 'https://images.genius.com/a.jpg');
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
    const link = screen.getAllByRole('link')[0];
    expect(link).toHaveAttribute('href', 'https://genius.com/artists/Luna-vale');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('Use this photo copies by geniusId and reports the Cloudinary URL and page', async () => {
    searchGeniusArtists.mockResolvedValue(matches);
    copyGeniusPhoto.mockResolvedValue({ imageUrl: 'https://res.cloudinary.com/x/a.jpg', sourceUrl: 'https://genius.com/artists/Luna-vale' });
    const { onPick, onClose } = show();
    await screen.findByText('Luna Vale');
    fireEvent.click(screen.getAllByRole('button', { name: 'Use this photo' })[0]);
    await waitFor(() => expect(onPick).toHaveBeenCalledWith({ imageUrl: 'https://res.cloudinary.com/x/a.jpg', sourceUrl: 'https://genius.com/artists/Luna-vale' }));
    expect(copyGeniusPhoto).toHaveBeenCalledWith(11);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows empty and error states, retry re-searches', async () => {
    searchGeniusArtists.mockResolvedValueOnce([]);
    show();
    expect(await screen.findByText('No matches on Genius')).toBeInTheDocument();

    searchGeniusArtists.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'catalog_genius_upstream' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Other' } });
    fireEvent.submit(screen.getByRole('searchbox').closest('form') as HTMLFormElement);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Genius did not respond');

    searchGeniusArtists.mockResolvedValueOnce(matches);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Luna Vale')).toBeInTheDocument();
    expect(searchGeniusArtists).toHaveBeenLastCalledWith('Other');
  });

  it('rows are disabled while copying', async () => {
    searchGeniusArtists.mockResolvedValue(matches);
    copyGeniusPhoto.mockReturnValue(new Promise(() => {}));
    show();
    await screen.findByText('Luna Vale');
    fireEvent.click(screen.getAllByRole('button', { name: 'Use this photo' })[0]);
    await waitFor(() => screen.getAllByRole('button', { name: /Use this photo|Copying/ }).forEach((b) => expect(b).toBeDisabled()));
    expect(copyGeniusPhoto).toHaveBeenCalledTimes(1);
  });
});
