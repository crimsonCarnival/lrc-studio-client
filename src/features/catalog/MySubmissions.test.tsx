// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { getMySubmissions, updateMyEntry, withdrawMyEntry, uploadCatalogImage } = vi.hoisted(() => ({
  uploadCatalogImage: vi.fn(),
  getMySubmissions: vi.fn(),
  updateMyEntry: vi.fn(),
  withdrawMyEntry: vi.fn(),
}));
vi.mock('./catalog.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMySubmissions,
  updateMyEntry,
  withdrawMyEntry,
  uploadCatalogImage,
}));
vi.mock('react-google-recaptcha-v3', () => ({ useGoogleReCaptcha: () => ({ executeRecaptcha: undefined }) }));
// The crop step needs a real canvas; here it is a stand-in that confirms a fixed blob.
vi.mock('@ui/ImageCropModal', () => ({
  ImageCropModal: ({ imageSrc, onConfirm }: { imageSrc: string | null; onConfirm: (b: Blob) => void }) =>
    imageSrc ? <button type="button" onClick={() => onConfirm(new Blob(['c'], { type: 'image/png' }))}>Use framed photo</button> : null,
}));
vi.mock('@/features/settings/useSettings', () => ({ useSettings: () => ({ settings: { advanced: { confirmDestructive: true } } }) }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { MemoryRouter } from 'react-router-dom';
import { MySubmissions } from './MySubmissions';

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

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
  render(<QueryClientProvider client={client}><MemoryRouter><MySubmissions onAddAlbum={onAddAlbum} /></MemoryRouter></QueryClientProvider>);
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

  it('asks before withdrawing and does nothing on cancel', async () => {
    show();
    await expand();
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw Pending Pal' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(withdrawMyEntry).not.toHaveBeenCalled();
  });

  it('withdraws a pending entry once confirmed', async () => {
    withdrawMyEntry.mockResolvedValue(true);
    show();
    await expand();
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw Pending Pal' }));
    expect(withdrawMyEntry).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
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

  it('offers Suggest an album only on approved artists', async () => {
    const onAddAlbum = show();
    await expand();
    expect(screen.queryByRole('button', { name: 'Suggest an album for Pending Pal' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Suggest an album for Approved Ann' }));
    expect(onAddAlbum).toHaveBeenCalledWith({ id: 'a2', name: 'Approved Ann', slug: 's' });
  });

  it('links approved artists to their catalog page, and only those', async () => {
    show();
    await expand();
    expect(screen.getByRole('link', { name: 'Approved Ann' })).toHaveAttribute('href', '/artists/s');
    expect(screen.queryByRole('link', { name: 'Pending Pal' })).not.toBeInTheDocument();
  });

  it('maps a failed withdraw to a message, not the raw text', async () => {
    withdrawMyEntry.mockRejectedValue(Object.assign(new Error('RAW SERVER TEXT'), { code: 'catalog_not_found' }));
    show();
    await expand();
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw Pending Pal' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('That entry no longer exists.')).toBeInTheDocument();
    expect(screen.queryByText('RAW SERVER TEXT')).not.toBeInTheDocument();
  });

  describe('photo', () => {
    const IMG = 'https://res.cloudinary.com/x/image/upload/c_fill,w_600,h_600,f_webp,q_auto/catalog/u1/old.webp';
    const withPhoto = { ...queue, artists: [{ ...base, id: 'a1', name: 'Pending Pal', status: 'pending', imageUrl: IMG }], albums: [] };

    async function editFirst() {
      getMySubmissions.mockResolvedValue(withPhoto);
      show();
      await expand();
      fireEvent.click(screen.getByRole('button', { name: 'Edit Pending Pal' }));
    }

    it('shows the stored photo as a thumbnail', async () => {
      getMySubmissions.mockResolvedValue(withPhoto);
      show();
      await expand();
      expect(screen.getByAltText('Image for Pending Pal')).toHaveAttribute('src', IMG);
    });

    it('leaves the image alone when only the text changes', async () => {
      updateMyEntry.mockResolvedValue(true);
      await editFirst();
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(updateMyEntry).toHaveBeenCalledWith({ kind: 'artist', id: 'a1', name: 'Pending Pal', bio: '' }));
    });

    it('clears the image with null when the photo is removed', async () => {
      updateMyEntry.mockResolvedValue(true);
      await editFirst();
      fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(updateMyEntry).toHaveBeenCalledWith({ kind: 'artist', id: 'a1', name: 'Pending Pal', bio: '', imageUrl: null }));
      expect(uploadCatalogImage).not.toHaveBeenCalled();
    });

    it('uploads the framed replacement and sends its URL', async () => {
      uploadCatalogImage.mockResolvedValue('https://res.cloudinary.com/x/image/upload/catalog/u1/new.webp');
      updateMyEntry.mockResolvedValue(true);
      await editFirst();
      fireEvent.change(screen.getByLabelText('Choose a photo'), { target: { files: [new File(['x'], 'new.jpg', { type: 'image/jpeg' })] } });
      fireEvent.click(await screen.findByRole('button', { name: 'Use framed photo' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(updateMyEntry).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: 'https://res.cloudinary.com/x/image/upload/catalog/u1/new.webp' })));
    });

    it('says the upload failed, and saves nothing, when the image upload throws', async () => {
      uploadCatalogImage.mockRejectedValue(new Error('network'));
      await editFirst();
      fireEvent.change(screen.getByLabelText('Choose a photo'), { target: { files: [new File(['x'], 'new.jpg', { type: 'image/jpeg' })] } });
      fireEvent.click(await screen.findByRole('button', { name: 'Use framed photo' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByText('The image could not be uploaded. Please try again.')).toBeInTheDocument();
      expect(updateMyEntry).not.toHaveBeenCalled();
    });
  });
});
