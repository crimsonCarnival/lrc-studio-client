// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { getReviewQueue, reviewEntry, adminListArtists, adminListAlbums, adminDelete, adminUpdate, adminCreateArtist, uploadCatalogImage, searchGeniusArtists, copyGeniusPhoto, withSudo, toast, auth } = vi.hoisted(() => ({
  getReviewQueue: vi.fn(),
  reviewEntry: vi.fn(),
  adminListArtists: vi.fn(),
  adminListAlbums: vi.fn(),
  adminDelete: vi.fn(),
  adminUpdate: vi.fn(),
  adminCreateArtist: vi.fn(),
  uploadCatalogImage: vi.fn(),
  searchGeniusArtists: vi.fn(),
  copyGeniusPhoto: vi.fn(),
  withSudo: vi.fn(),
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  auth: { permissions: ['catalog.review', 'catalog.manage'] as string[] },
}));
vi.mock('@/features/catalog/catalog.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getReviewQueue,
  reviewEntry,
  adminListArtists,
  adminListAlbums,
  adminDelete,
  adminUpdate,
  adminCreateArtist,
  uploadCatalogImage,
  searchGeniusArtists,
  copyGeniusPhoto,
}));
vi.mock('react-google-recaptcha-v3', () => ({ useGoogleReCaptcha: () => ({ executeRecaptcha: undefined }) }));
// The crop step needs a real canvas; here it is a stand-in that confirms a fixed blob.
vi.mock('@ui/ImageCropModal', () => ({
  ImageCropModal: ({ imageSrc, onConfirm }: { imageSrc: string | null; onConfirm: (b: Blob) => void }) =>
    imageSrc ? <button type="button" onClick={() => onConfirm(new Blob(['c'], { type: 'image/png' }))}>Use framed photo</button> : null,
}));
vi.mock('./services/sudo', async (importOriginal) => ({ ...(await importOriginal<object>()), withSudo }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: { permissions: auth.permissions } }) }));

import AdminCatalogTab from './AdminCatalogTab';

class ResizeObserverStub { observe() {} unobserve() {} disconnect() {} }
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

const submitter = (name: string) => ({ id: `u-${name}`, accountName: name, displayName: null, avatarUrl: null });
const base = { slug: null, source: 'community', reviewNote: null, imageUrl: null, bio: '', disambiguation: '', status: 'pending' };
const artist = (id: string, name: string, createdAt: string, extra = {}) => ({
  ...base, id, name, createdAt, updatedAt: `${createdAt}-u`, submittedBy: submitter('sam'), ...extra,
});
const queue = {
  artists: [
    artist('a2', 'Newer Act', '2026-02-01'),
    artist('a1', 'Older Act', '2026-01-01'),
  ],
  albums: [],
};

function show(path = '/admin/catalog/queue') {
  return render(<MemoryRouter initialEntries={[path]}><AdminCatalogTab /></MemoryRouter>);
}

const rowOf = (name: string) => screen.getByText(name).closest('li') as HTMLElement;

describe('AdminCatalogTab review queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.permissions = ['catalog.review', 'catalog.manage'];
    getReviewQueue.mockResolvedValue(queue);
    reviewEntry.mockResolvedValue(true);
    adminListArtists.mockResolvedValue([]);
    withSudo.mockImplementation((fn: () => unknown) => fn());
  });

  it('lists pending entries oldest first with the submitter', async () => {
    show();
    await screen.findByText('Older Act');
    const names = screen.getAllByRole('listitem').map((li) => li.textContent ?? '');
    expect(names[0]).toContain('Older Act');
    expect(names[1]).toContain('Newer Act');
    expect(within(rowOf('Older Act')).getByText(/sam/)).toBeInTheDocument();
  });

  it('approves with the loaded updatedAt and removes the row', async () => {
    show();
    await screen.findByText('Older Act');
    fireEvent.click(within(rowOf('Older Act')).getByRole('button', { name: /^Approve/ }));
    await waitFor(() => expect(screen.queryByText('Older Act')).not.toBeInTheDocument());
    expect(reviewEntry).toHaveBeenCalledWith({ kind: 'artist', id: 'a1', decision: 'approve', note: undefined, expectedUpdatedAt: '2026-01-01-u' });
  });

  it('sends the optional note when rejecting', async () => {
    show();
    await screen.findByText('Older Act');
    const row = rowOf('Older Act');
    fireEvent.change(within(row).getByRole('textbox'), { target: { value: '  not a real artist ' } });
    fireEvent.click(within(row).getByRole('button', { name: /^Reject/ }));
    await waitFor(() => expect(reviewEntry).toHaveBeenCalledWith(expect.objectContaining({ decision: 'reject', note: 'not a real artist', id: 'a1' })));
  });

  it('removes the row and toasts when it was already reviewed', async () => {
    reviewEntry.mockRejectedValueOnce(Object.assign(new Error('raw server text'), { code: 'catalog_already_reviewed' }));
    show();
    await screen.findByText('Older Act');
    fireEvent.click(within(rowOf('Older Act')).getByRole('button', { name: /^Approve/ }));
    await waitFor(() => expect(screen.queryByText('Older Act')).not.toBeInTheDocument());
    expect(toast.error).toHaveBeenCalledWith('Someone else already reviewed this entry.');
  });

  it('refetches the queue when the submitter edited the entry meanwhile', async () => {
    reviewEntry.mockRejectedValueOnce(Object.assign(new Error('raw'), { code: 'catalog_changed' }));
    show();
    await screen.findByText('Older Act');
    fireEvent.click(within(rowOf('Older Act')).getByRole('button', { name: /^Approve/ }));
    await waitFor(() => expect(getReviewQueue).toHaveBeenCalledTimes(2));
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('changed'));
    expect(toast.error).not.toHaveBeenCalledWith('raw');
  });

  it('keeps the row and shows a generic message for unknown failures', async () => {
    reviewEntry.mockRejectedValueOnce(new Error('internal stack trace'));
    show();
    await screen.findByText('Older Act');
    fireEvent.click(within(rowOf('Older Act')).getByRole('button', { name: /^Approve/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong. Please try again.'));
    expect(screen.getByText('Older Act')).toBeInTheDocument();
  });

  it('hints when another loaded entry shares the normalised name', async () => {
    getReviewQueue.mockResolvedValue({
      artists: [artist('a1', 'Cafe Tacvba', '2026-01-01'), artist('a2', '  cafe tacvba ', '2026-01-02'), artist('a3', 'Other', '2026-01-03')],
      albums: [],
    });
    show();
    await screen.findByText('Other');
    expect(screen.getAllByText('Another entry with this name already exists')).toHaveLength(2);
    expect(within(rowOf('Other')).queryByText(/same name/)).not.toBeInTheDocument();
  });

  it('previews only Cloudinary images', async () => {
    getReviewQueue.mockResolvedValue({
      artists: [
        artist('a1', 'Safe', '2026-01-01', { imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/catalog/a.jpg' }),
        artist('a2', 'Sneaky', '2026-01-02', { imageUrl: 'https://evil.example/track.png' }),
      ],
      albums: [],
    });
    show();
    await screen.findByText('Safe');
    expect(within(rowOf('Safe')).getByRole('img')).toHaveAttribute('src', expect.stringContaining('res.cloudinary.com'));
    expect(within(rowOf('Sneaky')).queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('AdminCatalogTab browse', () => {
  const approved = artist('a9', 'Approved Ann', '2026-01-01', { status: 'approved' });
  beforeEach(() => {
    vi.clearAllMocks();
    auth.permissions = ['catalog.review', 'catalog.manage'];
    getReviewQueue.mockResolvedValue({ artists: [], albums: [] });
    adminListArtists.mockResolvedValue([approved]);
    adminListAlbums.mockResolvedValue([]);
    adminDelete.mockResolvedValue(true);
    withSudo.mockImplementation((fn: () => unknown) => fn());
  });

  it('deletes behind sudo and passes revokeCredit', async () => {
    show('/admin/catalog/browse');
    await screen.findByText('Approved Ann');
    fireEvent.click(screen.getByRole('button', { name: /^Delete Approved Ann/ }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('checkbox'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(adminDelete).toHaveBeenCalledWith('artist', 'a9', true));
    expect(withSudo).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText('Approved Ann')).not.toBeInTheDocument());
  });

  it('does not revoke credit unless asked', async () => {
    show('/admin/catalog/browse');
    await screen.findByText('Approved Ann');
    fireEvent.click(screen.getByRole('button', { name: /^Delete Approved Ann/ }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(adminDelete).toHaveBeenCalledWith('artist', 'a9', false));
  });

  it('leaves the entry alone when the sudo prompt is cancelled', async () => {
    withSudo.mockRejectedValueOnce(Object.assign(new Error('sudo_cancelled'), { code: 'sudo_cancelled' }));
    show('/admin/catalog/browse');
    await screen.findByText('Approved Ann');
    fireEvent.click(screen.getByRole('button', { name: /^Delete Approved Ann/ }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(withSudo).toHaveBeenCalled());
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getByText('Approved Ann')).toBeInTheDocument();
  });
});

describe('AdminCatalogTab load failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.permissions = ['catalog.review', 'catalog.manage'];
    getReviewQueue.mockResolvedValue({ artists: [], albums: [] });
    adminListArtists.mockResolvedValue([]);
    adminListAlbums.mockResolvedValue([]);
  });

  it('shows an error with retry for the queue, not the empty state', async () => {
    getReviewQueue.mockRejectedValueOnce(new Error('boom'));
    show('/admin/catalog/queue');
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the review queue.');
    expect(screen.queryByText('Nothing is waiting for review.')).not.toBeInTheDocument();
    getReviewQueue.mockResolvedValueOnce(queue);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Older Act');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error with retry for the artist list', async () => {
    adminListArtists.mockRejectedValueOnce(new Error('boom'));
    show('/admin/catalog/browse');
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the catalog.');
    expect(screen.queryByText('No artists found.')).not.toBeInTheDocument();
    adminListArtists.mockResolvedValueOnce([artist('a9', 'Approved Ann', '2026-01-01', { status: 'approved' })]);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Approved Ann');
  });

  it('shows an error with retry for an artist’s albums, not "no albums"', async () => {
    adminListArtists.mockResolvedValue([artist('a9', 'Approved Ann', '2026-01-01', { status: 'approved' })]);
    adminListAlbums.mockRejectedValueOnce(new Error('boom'));
    show('/admin/catalog/browse');
    await screen.findByText('Approved Ann');
    fireEvent.click(screen.getByRole('button', { name: /^Show albums of/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the albums.');
    expect(screen.queryByText('No albums yet.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('No albums yet.');
  });
});

// The albums panel is modal: the artist grid behind it is inert until it closes.
const closeDrawer = () => fireEvent.click(screen.getByRole('button', { name: 'Close' }));

describe('AdminCatalogTab edit and delete options', () => {
  const adminArtist = artist('a7', 'Admin Act', '2026-01-01', { status: 'approved', source: 'admin', bio: 'old bio', disambiguation: '', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/catalog/a.jpg' });
  beforeEach(() => {
    vi.clearAllMocks();
    auth.permissions = ['catalog.review', 'catalog.manage'];
    getReviewQueue.mockResolvedValue({ artists: [], albums: [] });
    adminListArtists.mockResolvedValue([adminArtist]);
    adminListAlbums.mockResolvedValue([]);
    adminUpdate.mockResolvedValue(true);
    adminDelete.mockResolvedValue(true);
    withSudo.mockImplementation((fn: () => unknown) => fn());
  });

  it('sends only the changed fields when editing', async () => {
    show('/admin/catalog/browse');
    await screen.findByText('Admin Act');
    fireEvent.click(screen.getByRole('button', { name: /^Edit Admin Act/ }));
    fireEvent.change(screen.getByLabelText('Bio'), { target: { value: 'new bio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(adminUpdate).toHaveBeenCalledWith({ kind: 'artist', id: 'a7', bio: 'new bio' }));
  });

  it('sends null to remove the current image', async () => {
    show('/admin/catalog/browse');
    await screen.findByText('Admin Act');
    fireEvent.click(screen.getByRole('button', { name: /^Edit Admin Act/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(adminUpdate).toHaveBeenCalledWith({ kind: 'artist', id: 'a7', imageUrl: null }));
  });

  it('lists albums in the side panel and creates one from it', async () => {
    adminListAlbums.mockResolvedValue([{ id: 'al1', artistId: 'a7', title: 'First LP', year: '1999', coverUrl: null, source: 'admin', status: 'approved' }]);
    show('/admin/catalog/browse');
    await screen.findByText('Admin Act');
    fireEvent.click(screen.getByRole('button', { name: /^Show albums of/ }));
    expect(await screen.findByText('First LP')).toBeInTheDocument();
    expect(screen.getByText('1 album')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New album' }));
    expect(await screen.findByRole('heading', { name: 'New album' })).toBeInTheDocument();
  });

  it('loads the next page of artists with the current offset', async () => {
    const first = Array.from({ length: 24 }, (_, i) => artist(`p${i}`, `Artist ${i}`, '2026-01-01', { status: 'approved', source: 'admin' }));
    adminListArtists.mockResolvedValueOnce(first).mockResolvedValueOnce([artist('p24', 'Artist 24', '2026-01-01', { status: 'approved', source: 'admin' })]);
    show('/admin/catalog/browse');
    await screen.findByText('Artist 0');
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await screen.findByText('Artist 24');
    expect(adminListArtists).toHaveBeenLastCalledWith({ query: undefined, offset: 24, limit: 24 });
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('offers the revoke option with a hint for an artist whose albums are not loaded', async () => {
    show('/admin/catalog/browse');
    await screen.findByText('Admin Act');
    fireEvent.click(screen.getByRole('button', { name: /^Delete Admin Act/ }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByRole('checkbox')).toBeInTheDocument();
    expect(within(dialog).getByText(/Only applies to community-submitted/)).toBeInTheDocument();
  });

  it('offers the revoke option for an admin artist that has a community album', async () => {
    adminListAlbums.mockResolvedValue([{ id: 'al1', artistId: 'a7', title: 'Fan Album', year: null, coverUrl: null, source: 'community', status: 'approved' }]);
    show('/admin/catalog/browse');
    await screen.findByText('Admin Act');
    fireEvent.click(screen.getByRole('button', { name: /^Show albums of/ }));
    await screen.findByText('Fan Album');
    closeDrawer();
    fireEvent.click(screen.getByRole('button', { name: /^Delete Admin Act/ }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByRole('checkbox')).toBeInTheDocument();
    expect(within(dialog).queryByText(/Only applies to community-submitted/)).not.toBeInTheDocument();
  });

  it('hides the revoke option when the artist and all its albums are admin-made', async () => {
    show('/admin/catalog/browse');
    await screen.findByText('Admin Act');
    fireEvent.click(screen.getByRole('button', { name: /^Show albums of/ }));
    await screen.findByText('No albums yet.');
    closeDrawer();
    fireEvent.click(screen.getByRole('button', { name: /^Delete Admin Act/ }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument();
  });
});

describe('AdminCatalogTab permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getReviewQueue.mockResolvedValue(queue);
    adminListArtists.mockResolvedValue([]);
  });

  it('shows only the queue to a reviewer without catalog.manage', async () => {
    auth.permissions = ['catalog.review'];
    show('/admin/catalog/browse');
    await screen.findByText('Older Act');
    expect(adminListArtists).not.toHaveBeenCalled();
    expect(screen.queryByRole('tab', { name: 'Browse' })).not.toBeInTheDocument();
  });

  it('shows only browse to a manager without catalog.review', async () => {
    auth.permissions = ['catalog.manage'];
    show('/admin/catalog/queue');
    await waitFor(() => expect(adminListArtists).toHaveBeenCalled());
    expect(getReviewQueue).not.toHaveBeenCalled();
  });
});

describe('AdminCatalogTab Genius photo', () => {
  const adminArtist = artist('a7', 'Admin Act', '2026-01-01', { status: 'approved', source: 'admin' });
  const cloud = { imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/catalog/g.jpg', sourceUrl: 'https://genius.com/artists/Luna-vale' };

  beforeEach(() => {
    vi.clearAllMocks();
    auth.permissions = ['catalog.review', 'catalog.manage'];
    getReviewQueue.mockResolvedValue({ artists: [], albums: [] });
    adminListArtists.mockResolvedValue([adminArtist]);
    adminListAlbums.mockResolvedValue([]);
    adminCreateArtist.mockResolvedValue({ id: 'new' });
    searchGeniusArtists.mockResolvedValue([{ geniusId: 11, name: 'Luna Vale', imageUrl: 'https://images.genius.com/a.jpg', url: cloud.sourceUrl }]);
    copyGeniusPhoto.mockResolvedValue(cloud);
    withSudo.mockImplementation((fn: () => unknown) => fn());
  });

  async function openNewArtist() {
    show('/admin/catalog/browse');
    await screen.findByText('Admin Act');
    fireEvent.click(screen.getByRole('button', { name: 'New artist' }));
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Luna Vale' } });
  }

  async function pickGenius() {
    fireEvent.click(screen.getByRole('button', { name: 'Fetch from Genius' }));
    await waitFor(() => expect(searchGeniusArtists).toHaveBeenCalledWith('Luna Vale'));
    fireEvent.click(await screen.findByRole('button', { name: 'Use this photo' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Use this photo' })).not.toBeInTheDocument());
  }

  it('creating an artist with a Genius photo sends imageSource genius and the page URL', async () => {
    await openNewArtist();
    await pickGenius();
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(adminCreateArtist).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Luna Vale', imageUrl: cloud.imageUrl, imageSource: 'genius', imageSourceUrl: cloud.sourceUrl,
    })));
    expect(uploadCatalogImage).not.toHaveBeenCalled();
  });

  it('uploading a file after picking Genius sends no imageSource', async () => {
    uploadCatalogImage.mockResolvedValue('https://res.cloudinary.com/demo/image/upload/v1/catalog/u.png');
    await openNewArtist();
    await pickGenius();
    fireEvent.change(screen.getByLabelText('Choose a photo'), { target: { files: [new File(['x'], 'luna.jpg', { type: 'image/jpeg' })] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Use framed photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(adminCreateArtist).toHaveBeenCalled());
    const input = adminCreateArtist.mock.calls[0][0] as Record<string, unknown>;
    expect(input.imageUrl).toBe('https://res.cloudinary.com/demo/image/upload/v1/catalog/u.png');
    expect(input).not.toHaveProperty('imageSource');
    expect(input).not.toHaveProperty('imageSourceUrl');
  });

  it('album dialog has no Genius button', async () => {
    show('/admin/catalog/browse');
    await screen.findByText('Admin Act');
    fireEvent.click(screen.getByRole('button', { name: /^Show albums of/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'New album' }));
    await screen.findByRole('heading', { name: 'New album' });
    expect(screen.queryByRole('button', { name: 'Fetch from Genius' })).not.toBeInTheDocument();
  });
});
