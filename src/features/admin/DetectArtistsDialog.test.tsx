// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { CatalogArtist } from '@/features/catalog/catalog.types';

const { detectArtists, approveDetectedArtist, dismissDetectedArtist, toast } = vi.hoisted(() => ({
  detectArtists: vi.fn(),
  approveDetectedArtist: vi.fn(),
  dismissDetectedArtist: vi.fn(),
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock('@/features/catalog/catalog.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  detectArtists,
  approveDetectedArtist,
  dismissDetectedArtist,
}));
vi.mock('react-hot-toast', () => ({ default: toast }));

import { DetectArtistsDialog } from './DetectArtistsDialog';

const artist = { id: 'a1', name: 'Björk' } as CatalogArtist;
const findings = [
  { key: 'björk', name: 'Björk', songCount: 12 },
  { key: 'moby', name: 'Moby', songCount: 1 },
];

function show(open = true) {
  const onApproved = vi.fn();
  const onClose = vi.fn();
  render(<DetectArtistsDialog open={open} onApproved={onApproved} onClose={onClose} />);
  return { onApproved, onClose };
}
const row = (name: string) => screen.getByText(name).closest('li') as HTMLElement;

describe('DetectArtistsDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not scan while closed', () => {
    show(false);
    expect(detectArtists).not.toHaveBeenCalled();
  });

  it('lists findings with song counts', async () => {
    detectArtists.mockResolvedValue(findings);
    show();
    expect(await screen.findByText('Björk')).toBeInTheDocument();
    expect(within(row('Björk')).getByText('12 songs')).toBeInTheDocument();
    expect(within(row('Moby')).getByText('1 song')).toBeInTheDocument();
  });

  it('approve sends the name, removes the row, calls onApproved', async () => {
    detectArtists.mockResolvedValue(findings);
    approveDetectedArtist.mockResolvedValue(artist);
    const { onApproved } = show();
    await screen.findByText('Björk');
    fireEvent.click(within(row('Björk')).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.queryByText('Björk')).not.toBeInTheDocument());
    expect(approveDetectedArtist).toHaveBeenCalledWith('Björk');
    expect(onApproved).toHaveBeenCalledWith(artist);
    expect(toast.success).toHaveBeenCalledWith('Artist added to the catalog.');
    expect(screen.getByText('Moby')).toBeInTheDocument();
  });

  it('reject sends the key and removes the row', async () => {
    detectArtists.mockResolvedValue(findings);
    dismissDetectedArtist.mockResolvedValue(true);
    show();
    await screen.findByText('Moby');
    fireEvent.click(within(row('Moby')).getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(screen.queryByText('Moby')).not.toBeInTheDocument());
    expect(dismissDetectedArtist).toHaveBeenCalledWith('moby');
    expect(toast.success).toHaveBeenCalledWith('Finding dismissed.');
  });

  it('duplicate on approve removes the stale row', async () => {
    detectArtists.mockResolvedValue(findings);
    approveDetectedArtist.mockRejectedValue(Object.assign(new Error('raw'), { code: 'catalog_duplicate' }));
    const { onApproved } = show();
    await screen.findByText('Björk');
    fireEvent.click(within(row('Björk')).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.queryByText('Björk')).not.toBeInTheDocument());
    expect(toast.error).toHaveBeenCalled();
    expect(onApproved).not.toHaveBeenCalled();
  });

  it('a failed approve keeps the row and does not leak the raw error', async () => {
    detectArtists.mockResolvedValue(findings);
    approveDetectedArtist.mockRejectedValue(new Error('internal stack trace'));
    show();
    await screen.findByText('Björk');
    fireEvent.click(within(row('Björk')).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.error).not.toHaveBeenCalledWith(expect.stringContaining('internal'));
    expect(within(row('Björk')).getByRole('button', { name: 'Approve' })).toBeEnabled();
  });

  it('empty state', async () => {
    detectArtists.mockResolvedValue([]);
    show();
    expect(await screen.findByText('No new artists found.')).toBeInTheDocument();
  });

  it('load error shows retry, retry reloads', async () => {
    detectArtists.mockRejectedValueOnce(new Error('boom'));
    show();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    detectArtists.mockResolvedValueOnce(findings);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Björk')).toBeInTheDocument();
    expect(detectArtists).toHaveBeenCalledTimes(2);
  });
});
