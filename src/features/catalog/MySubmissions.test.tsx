// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { getMySubmissions, updateMyEntry, withdrawMyEntry } = vi.hoisted(() => ({
  getMySubmissions: vi.fn(),
  updateMyEntry: vi.fn(),
  withdrawMyEntry: vi.fn(),
}));
vi.mock('./catalog.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMySubmissions,
  updateMyEntry,
  withdrawMyEntry,
}));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { MySubmissions } from './MySubmissions';

const base = { slug: 's', source: 'community', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', reviewNote: null, imageUrl: null, bio: null, disambiguation: null };
const queue = {
  artists: [
    { ...base, id: 'a1', name: 'Pending Pal', status: 'pending' },
    { ...base, id: 'a2', name: 'Approved Ann', status: 'approved' },
    { ...base, id: 'a3', name: 'Rejected Rex', status: 'rejected', reviewNote: 'Looks like a duplicate' },
  ],
  albums: [{ ...base, id: 'b1', artistId: 'a2', title: 'Pending Album', year: '2020', coverUrl: null, status: 'pending' }],
};

function show(onAddAlbum = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MySubmissions onAddAlbum={onAddAlbum} /></QueryClientProvider>);
  return onAddAlbum;
}

async function expand() {
  fireEvent.click(await screen.findByRole('button', { name: /My submissions/ }));
  await screen.findByText('Pending Pal');
}

describe('MySubmissions', () => {
  beforeEach(() => { vi.clearAllMocks(); getMySubmissions.mockResolvedValue(queue); });

  it('is collapsed by default', async () => {
    show();
    const toggle = await screen.findByRole('button', { name: /My submissions/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Pending Pal')).not.toBeInTheDocument();
  });

  it('shows status chips and the rejection note', async () => {
    show();
    await expand();
    expect(screen.getByText('Pending Pal')).toBeInTheDocument();
    expect(screen.getAllByText('Pending')).toHaveLength(2);
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Reviewer note: Looks like a duplicate')).toBeInTheDocument();
  });

  it('offers edit and withdraw only for pending entries', async () => {
    show();
    await expand();
    expect(screen.getByRole('button', { name: 'Withdraw Pending Pal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Withdraw Pending Album' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Withdraw Approved Ann' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Withdraw Rejected Rex' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Rejected Rex' })).not.toBeInTheDocument();
  });

  it('withdraws a pending entry', async () => {
    withdrawMyEntry.mockResolvedValue(true);
    show();
    await expand();
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw Pending Pal' }));
    await waitFor(() => expect(withdrawMyEntry).toHaveBeenCalledWith('artist', 'a1'));
  });

  it('edits a pending artist name', async () => {
    updateMyEntry.mockResolvedValue(true);
    show();
    await expand();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Pending Pal' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Pending Paul' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updateMyEntry).toHaveBeenCalledWith({ kind: 'artist', id: 'a1', name: 'Pending Paul', bio: '' }));
  });

  it('offers Add album only on approved artists', async () => {
    const onAddAlbum = show();
    await expand();
    expect(screen.queryByRole('button', { name: 'Add an album to Pending Pal' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add an album to Approved Ann' }));
    expect(onAddAlbum).toHaveBeenCalledWith({ id: 'a2', name: 'Approved Ann' });
  });

  it('maps a failed withdraw to a message, not the raw text', async () => {
    withdrawMyEntry.mockRejectedValue(Object.assign(new Error('RAW SERVER TEXT'), { code: 'catalog_not_found' }));
    show();
    await expand();
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw Pending Pal' }));
    expect(await screen.findByText('That entry no longer exists.')).toBeInTheDocument();
    expect(screen.queryByText('RAW SERVER TEXT')).not.toBeInTheDocument();
  });
});
void within;
