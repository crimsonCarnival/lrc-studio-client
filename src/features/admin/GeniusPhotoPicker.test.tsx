// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const svc = vi.hoisted(() => ({ searchGeniusArtists: vi.fn(), copyGeniusPhoto: vi.fn(), searchGeniusAlbums: vi.fn(), copyGeniusAlbumCover: vi.fn(), listProjectCovers: vi.fn(), copyProjectCover: vi.fn() }));
const { searchGeniusArtists, copyGeniusPhoto, searchGeniusAlbums, copyGeniusAlbumCover, listProjectCovers, copyProjectCover } = svc;
vi.mock('@/features/catalog/catalog.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...svc,
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

  it('a failed copy shows its error inside that row, with a Retry on the same row', async () => {
    searchGeniusArtists.mockResolvedValue(matches);
    copyGeniusPhoto.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'catalog_genius_upstream' }));
    show();
    await screen.findByText('Luna Vale');
    fireEvent.click(screen.getAllByRole('button', { name: 'Use this photo' })[1]);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Genius did not respond');
    const row = alert.closest('li') as HTMLElement;
    expect(row).toHaveTextContent('Luna Vales');
    expect(row.querySelector('button')).toHaveTextContent('Retry');
    expect(screen.getAllByRole('button', { name: 'Use this photo' })).toHaveLength(1);
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

  it('closes on Escape after a successful pick when the picker is reopened', async () => {
    searchGeniusArtists.mockResolvedValue(matches);
    copyGeniusPhoto.mockResolvedValue({ imageUrl: 'https://res.cloudinary.com/x/a.jpg', sourceUrl: 'https://genius.com/artists/Luna-vale' });
    const onPick = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(<GeniusPhotoPicker open initialQuery="Luna" onPick={onPick} onClose={onClose} />);
    await screen.findByText('Luna Vale');
    fireEvent.click(screen.getAllByRole('button', { name: 'Use this photo' })[0]);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    rerender(<GeniusPhotoPicker open={false} initialQuery="Luna" onPick={onPick} onClose={onClose} />);
    rerender(<GeniusPhotoPicker open initialQuery="Luna" onPick={onPick} onClose={onClose} />);
    await screen.findByText('Luna Vale');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
  });

  it('ignores a slower earlier search that resolves after a newer one', async () => {
    let resolveA: (v: typeof matches) => void = () => {};
    searchGeniusArtists.mockResolvedValueOnce([]);
    show();
    await screen.findByText('No matches on Genius');
    const box = screen.getByRole('searchbox');
    const form = box.closest('form') as HTMLFormElement;
    searchGeniusArtists.mockReturnValueOnce(new Promise((r) => { resolveA = r; }));
    fireEvent.change(box, { target: { value: 'A' } });
    fireEvent.submit(form);
    searchGeniusArtists.mockResolvedValueOnce([matches[1]]);
    fireEvent.change(box, { target: { value: 'B' } });
    fireEvent.submit(form);
    expect(await screen.findByText('Luna Vales')).toBeInTheDocument();
    resolveA(matches);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText('Luna Vale')).not.toBeInTheDocument();
    expect(screen.getByText('Luna Vales')).toBeInTheDocument();
  });
});

describe('GeniusPhotoPicker (album covers)', () => {
  const albumMatches = [{ geniusId: 5, name: 'OK Computer', artistName: 'Radiohead', imageUrl: 'https://images.genius.com/c.jpg', url: 'https://genius.com/albums/Radiohead/Ok-computer' }];
  const songs = [{ publicId: 'p1', title: 'Airbag', coverUrl: 'https://res.cloudinary.com/x/image/upload/a.jpg' }];
  const showAlbum = (songCovers?: { artistId: string; title: string }) => {
    const onPick = vi.fn();
    const onClose = vi.fn();
    render(<GeniusPhotoPicker open kind="album" initialQuery="Radiohead OK Computer" songCovers={songCovers} onPick={onPick} onClose={onClose} />);
    return { onPick, onClose };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    searchGeniusAlbums.mockResolvedValue(albumMatches);
    listProjectCovers.mockResolvedValue([]);
  });

  it('searches Genius albums, shows the artist and copies the album cover', async () => {
    copyGeniusAlbumCover.mockResolvedValue({ imageUrl: 'https://res.cloudinary.com/x/c.webp', sourceUrl: 'https://genius.com/albums/Radiohead/Ok-computer' });
    const { onPick } = showAlbum();
    expect(await screen.findByText('OK Computer')).toBeInTheDocument();
    expect(screen.getByText('Radiohead')).toBeInTheDocument();
    expect(searchGeniusAlbums).toHaveBeenCalledWith('Radiohead OK Computer');
    expect(searchGeniusArtists).not.toHaveBeenCalled();
    expect(listProjectCovers).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Use this cover' }));
    await waitFor(() => expect(onPick).toHaveBeenCalledWith({ imageUrl: 'https://res.cloudinary.com/x/c.webp', sourceUrl: 'https://genius.com/albums/Radiohead/Ok-computer' }));
    expect(copyGeniusAlbumCover).toHaveBeenCalledWith(5);
  });

  it('offers covers from songs on the album first and copies them by publicId', async () => {
    listProjectCovers.mockResolvedValue(songs);
    copyProjectCover.mockResolvedValue({ imageUrl: 'https://res.cloudinary.com/x/catalog/p.webp' });
    const { onPick } = showAlbum({ artistId: 'a1', title: 'OK Computer' });
    expect(await screen.findByText('Airbag')).toBeInTheDocument();
    expect(listProjectCovers).toHaveBeenCalledWith('a1', 'OK Computer');
    expect(screen.getByText('From songs on this album')).toBeInTheDocument();
    await screen.findByText('Radiohead');
    const buttons = screen.getAllByRole('button', { name: 'Use this cover' });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(onPick).toHaveBeenCalledWith({ imageUrl: 'https://res.cloudinary.com/x/catalog/p.webp' }));
    expect(copyProjectCover).toHaveBeenCalledWith({ artistId: 'a1', title: 'OK Computer', publicId: 'p1' });
    expect(copyGeniusAlbumCover).not.toHaveBeenCalled();
  });

  it('a failing song-cover lookup does not hide the Genius results', async () => {
    listProjectCovers.mockRejectedValue(new Error('x'));
    showAlbum({ artistId: 'a1', title: 'OK Computer' });
    expect(await screen.findByText('OK Computer')).toBeInTheDocument();
    expect(screen.queryByText('From songs on this album')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('a failed song-cover copy is reported inside that row', async () => {
    listProjectCovers.mockResolvedValue(songs);
    copyProjectCover.mockRejectedValue(Object.assign(new Error('x'), { code: 'catalog_cover_proposal_not_found' }));
    showAlbum({ artistId: 'a1', title: 'OK Computer' });
    await screen.findByText('Airbag');
    await screen.findByText('Radiohead');
    fireEvent.click(screen.getAllByRole('button', { name: 'Use this cover' })[0]);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('no longer available');
    expect(alert.closest('li')).toHaveTextContent('Airbag');
  });
});
