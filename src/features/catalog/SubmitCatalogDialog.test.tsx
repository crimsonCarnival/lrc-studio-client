// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { submitCatalogArtist, submitCatalogAlbum, uploadCatalogImage, success } = vi.hoisted(() => ({
  submitCatalogArtist: vi.fn(),
  submitCatalogAlbum: vi.fn(),
  uploadCatalogImage: vi.fn(),
  success: vi.fn(),
}));
vi.mock('./catalog.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  submitCatalogArtist,
  submitCatalogAlbum,
  uploadCatalogImage,
}));
vi.mock('react-google-recaptcha-v3', () => ({ useGoogleReCaptcha: () => ({ executeRecaptcha: undefined }) }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success, error: vi.fn() }) }));

import { SubmitCatalogDialog } from './SubmitCatalogDialog';

const apiError = (code: string, extensions: Record<string, unknown> = {}) =>
  Object.assign(new Error('RAW SERVER TEXT'), { code, graphqlErrors: [{ message: 'RAW SERVER TEXT', extensions: { code, ...extensions } }] });

function open(target: React.ComponentProps<typeof SubmitCatalogDialog>['target'] = { kind: 'artist' }, onOpenChange = vi.fn()) {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter><SubmitCatalogDialog open onOpenChange={onOpenChange} target={target} /></MemoryRouter>
    </QueryClientProvider>,
  );
  return onOpenChange;
}

const submitBtn = () => screen.getByRole('button', { name: 'Submit for review' });
const typeName = (v: string) => fireEvent.change(screen.getByLabelText('Artist name'), { target: { value: v } });

describe('SubmitCatalogDialog (artist)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps submit disabled until a name is present', () => {
    open();
    expect(submitBtn()).toBeDisabled();
    typeName('   ');
    expect(submitBtn()).toBeDisabled();
    typeName('Luna Vale');
    expect(submitBtn()).toBeEnabled();
  });

  it('shows a live bio counter against the 1,000 limit', () => {
    open();
    expect(screen.getByText('0 / 1000')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Short bio (optional)'), { target: { value: 'hello' } });
    expect(screen.getByText('5 / 1000')).toBeInTheDocument();
  });

  it('submits the trimmed name and closes on success', async () => {
    submitCatalogArtist.mockResolvedValue({ id: 'c1' });
    const onOpenChange = open();
    typeName('  Luna Vale ');
    fireEvent.click(submitBtn());
    await waitFor(() => expect(submitCatalogArtist).toHaveBeenCalledWith({ name: 'Luna Vale', bio: undefined, imageUrl: undefined }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(success).toHaveBeenCalled();
  });

  it('shows catalog_duplicate as already in the catalog, linking only when a slug came back', async () => {
    submitCatalogArtist.mockRejectedValue(apiError('catalog_duplicate', { existing: { id: 'e1', name: 'Luna Vale', slug: 'luna-vale' } }));
    open();
    typeName('Luna Vale');
    fireEvent.click(submitBtn());
    expect(await screen.findByText('This is already in the catalog.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Luna Vale' })).toHaveAttribute('href', '/artists/luna-vale');
    expect(screen.queryByText('RAW SERVER TEXT')).not.toBeInTheDocument();
  });

  it('renders no link when the duplicate came back without a slug', async () => {
    submitCatalogArtist.mockRejectedValue(apiError('catalog_duplicate', { existing: { id: 'e1', name: 'Luna Vale' } }));
    open();
    typeName('Luna Vale');
    fireEvent.click(submitBtn());
    expect(await screen.findByText('This is already in the catalog.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows the verify-email message for catalog_unverified', async () => {
    submitCatalogArtist.mockRejectedValue(apiError('catalog_unverified'));
    open();
    typeName('Luna Vale');
    fireEvent.click(submitBtn());
    expect(await screen.findByText('Verify your email before suggesting catalog entries.')).toBeInTheDocument();
  });

  it('maps unknown failures to the generic message, never the raw text', async () => {
    submitCatalogArtist.mockRejectedValue(apiError('something_new'));
    open();
    typeName('Luna Vale');
    fireEvent.click(submitBtn());
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText('RAW SERVER TEXT')).not.toBeInTheDocument();
  });

  it('rejects a non-image file before uploading', async () => {
    open();
    typeName('Luna Vale');
    const input = screen.getByLabelText('Choose a photo');
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] } });
    expect(await screen.findByText('Choose an image file.')).toBeInTheDocument();
    expect(uploadCatalogImage).not.toHaveBeenCalled();
  });

  it('rejects an image over 5 MB before uploading', async () => {
    open();
    const big = new File(['x'], 'a.png', { type: 'image/png' });
    Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 });
    fireEvent.change(screen.getByLabelText('Choose a photo'), { target: { files: [big] } });
    expect(await screen.findByText('The image is larger than 5 MB.')).toBeInTheDocument();
    expect(uploadCatalogImage).not.toHaveBeenCalled();
  });

  it('drops a previously chosen file when a new pick is invalid', async () => {
    submitCatalogArtist.mockResolvedValue({ id: 'c1' });
    open();
    typeName('Luna Vale');
    const input = screen.getByLabelText('Choose a photo');
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } });
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] } });
    expect(await screen.findByText('Choose an image file.')).toBeInTheDocument();
    fireEvent.click(submitBtn());
    await waitFor(() => expect(submitCatalogArtist).toHaveBeenCalled());
    expect(uploadCatalogImage).not.toHaveBeenCalled();
  });

  it('uploads a valid image on submit and sends its URL', async () => {
    uploadCatalogImage.mockResolvedValue('https://res.cloudinary.com/x/image/upload/catalog/a.png');
    submitCatalogArtist.mockResolvedValue({ id: 'c1' });
    open();
    typeName('Luna Vale');
    fireEvent.change(screen.getByLabelText('Choose a photo'), { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } });
    fireEvent.click(submitBtn());
    await waitFor(() => expect(submitCatalogArtist).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: 'https://res.cloudinary.com/x/image/upload/catalog/a.png' })));
  });
});

describe('SubmitCatalogDialog (album)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('needs a title and submits against the chosen artist', async () => {
    submitCatalogAlbum.mockResolvedValue({ id: 'al1' });
    open({ kind: 'album', artistId: 'c1', artistName: 'Luna Vale' });
    expect(screen.getByText('Suggest an album for Luna Vale')).toBeInTheDocument();
    expect(submitBtn()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Album title'), { target: { value: 'Moonrise' } });
    fireEvent.change(screen.getByLabelText('Year (optional)'), { target: { value: '2020' } });
    fireEvent.click(submitBtn());
    await waitFor(() => expect(submitCatalogAlbum).toHaveBeenCalledWith({ artistId: 'c1', title: 'Moonrise', year: '2020', coverUrl: undefined }));
  });

  it('explains catalog_parent_not_approved', async () => {
    submitCatalogAlbum.mockRejectedValue(apiError('catalog_parent_not_approved'));
    open({ kind: 'album', artistId: 'c1', artistName: 'Luna Vale' });
    fireEvent.change(screen.getByLabelText('Album title'), { target: { value: 'Moonrise' } });
    fireEvent.click(submitBtn());
    expect(await screen.findByText('The artist must be approved before you can add albums to it.')).toBeInTheDocument();
  });
});
