// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { CatalogAlbum, CatalogArtist } from '@/features/catalog/catalog.types';

const { detectAlbums, approveDetectedAlbum, dismissDetectedAlbum, toast } = vi.hoisted(() => ({
  detectAlbums: vi.fn(),
  approveDetectedAlbum: vi.fn(),
  dismissDetectedAlbum: vi.fn(),
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock('@/features/catalog/catalog.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  detectAlbums,
  approveDetectedAlbum,
  dismissDetectedAlbum,
}));
vi.mock('react-hot-toast', () => ({ default: toast }));

import { DetectAlbumsDialog } from './DetectAlbumsDialog';

const artist = { id: 'a7', name: 'Admin Act' } as CatalogArtist;
const other = { id: 'b8', name: 'Other Act' } as CatalogArtist;
const album = { id: 'al1', artistId: 'a7', title: 'Blue', year: '1999' } as CatalogAlbum;
const findings = [
  { key: 'blue', title: 'Blue', songCount: 12, year: '1999' },
  { key: 'green', title: 'Green', songCount: 1, year: null },
];

function show(target: CatalogArtist | null = artist) {
  const onApproved = vi.fn();
  const onClose = vi.fn();
  const ui = (a: CatalogArtist | null) => <DetectAlbumsDialog artist={a} onApproved={onApproved} onClose={onClose} />;
  const view = render(ui(target));
  return { onApproved, onClose, rerender: (a: CatalogArtist | null) => view.rerender(ui(a)) };
}
const row = (title: string) => screen.getByText(title).closest('li') as HTMLElement;

describe('DetectAlbumsDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists findings with song counts and years', async () => {
    detectAlbums.mockResolvedValue(findings);
    show();
    expect(await screen.findByText('Blue')).toBeInTheDocument();
    expect(detectAlbums).toHaveBeenCalledWith('a7');
    expect(within(row('Blue')).getByText('12 songs')).toBeInTheDocument();
    expect(within(row('Blue')).getByText('1999')).toBeInTheDocument();
    expect(within(row('Green')).getByText('1 song')).toBeInTheDocument();
  });

  it('approve sends title and year, removes the row, calls onApproved', async () => {
    detectAlbums.mockResolvedValue(findings);
    approveDetectedAlbum.mockResolvedValue(album);
    const { onApproved } = show();
    await screen.findByText('Blue');
    fireEvent.click(within(row('Blue')).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.queryByText('Blue')).not.toBeInTheDocument());
    expect(approveDetectedAlbum).toHaveBeenCalledWith({ artistId: 'a7', title: 'Blue', year: '1999' });
    expect(onApproved).toHaveBeenCalledWith(album);
    expect(toast.success).toHaveBeenCalledWith('Album added to the catalog.');
    expect(screen.getByText('Green')).toBeInTheDocument();
  });

  it('reject sends the key and removes the row', async () => {
    detectAlbums.mockResolvedValue(findings);
    dismissDetectedAlbum.mockResolvedValue(true);
    show();
    await screen.findByText('Green');
    fireEvent.click(within(row('Green')).getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(screen.queryByText('Green')).not.toBeInTheDocument());
    expect(dismissDetectedAlbum).toHaveBeenCalledWith('a7', 'green');
    expect(toast.success).toHaveBeenCalledWith('Finding dismissed.');
  });

  it('duplicate on approve removes the row', async () => {
    detectAlbums.mockResolvedValue(findings);
    approveDetectedAlbum.mockRejectedValue(Object.assign(new Error('raw'), { code: 'catalog_duplicate' }));
    const { onApproved } = show();
    await screen.findByText('Blue');
    fireEvent.click(within(row('Blue')).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.queryByText('Blue')).not.toBeInTheDocument());
    expect(toast.error).toHaveBeenCalledWith('This is already in the catalog.');
    expect(onApproved).not.toHaveBeenCalled();
  });

  it('a failed approve keeps the row and toasts', async () => {
    detectAlbums.mockResolvedValue(findings);
    approveDetectedAlbum.mockRejectedValue(new Error('internal stack trace'));
    show();
    await screen.findByText('Blue');
    fireEvent.click(within(row('Blue')).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.error).not.toHaveBeenCalledWith(expect.stringContaining('internal'));
    expect(screen.getByText('Blue')).toBeInTheDocument();
    expect(within(row('Blue')).getByRole('button', { name: 'Approve' })).toBeEnabled();
  });

  it('disables the row while busy', async () => {
    detectAlbums.mockResolvedValue(findings);
    approveDetectedAlbum.mockReturnValue(new Promise(() => {}));
    show();
    await screen.findByText('Blue');
    fireEvent.click(within(row('Blue')).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(within(row('Blue')).getByRole('button', { name: 'Approve' })).toBeDisabled());
    expect(within(row('Blue')).getByRole('button', { name: 'Reject' })).toBeDisabled();
  });

  it('empty state', async () => {
    detectAlbums.mockResolvedValue([]);
    show();
    expect(await screen.findByText('No new albums found for this artist.')).toBeInTheDocument();
  });

  it('load error shows retry, retry reloads', async () => {
    detectAlbums.mockRejectedValueOnce(new Error('boom'));
    show();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    detectAlbums.mockResolvedValueOnce(findings);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Blue')).toBeInTheDocument();
    expect(detectAlbums).toHaveBeenCalledTimes(2);
  });

  it('ignores a slow load once another artist is open', async () => {
    let resolveOld: (v: typeof findings) => void = () => {};
    detectAlbums.mockImplementationOnce(() => new Promise((r) => { resolveOld = r; }));
    detectAlbums.mockResolvedValueOnce([{ key: 'x', title: 'Fresh', songCount: 3, year: null }]);
    const { rerender } = show(artist);
    rerender(null);
    rerender(other);
    expect(await screen.findByText('Fresh')).toBeInTheDocument();
    resolveOld(findings);
    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByText('Blue')).not.toBeInTheDocument();
    expect(screen.getByText('Fresh')).toBeInTheDocument();
  });
});
