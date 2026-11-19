import { beforeEach, describe, expect, it, vi } from 'vitest';

const { gqlRequest, request } = vi.hoisted(() => ({ gqlRequest: vi.fn(), request: vi.fn() }));
vi.mock('@/app/graphql.client', () => ({ gqlRequest }));
vi.mock('@/app/api.client', () => ({ request }));

import * as catalog from './catalog.service';
import { catalogErrorCode } from './catalog.service';
import { userHasPermission } from '@/features/auth/permissions';

const call = () => ({ query: gqlRequest.mock.calls[0][0] as string, vars: gqlRequest.mock.calls[0][1] });

beforeEach(() => {
  gqlRequest.mockReset();
  request.mockReset();
  vi.unstubAllGlobals();
});

describe('catalog service operations', () => {
  it.each([
    ['submitCatalogArtist', () => catalog.submitCatalogArtist({ name: 'A', bio: 'b' }), 'submitCatalogArtist', { name: 'A', bio: 'b' }],
    ['submitCatalogAlbum', () => catalog.submitCatalogAlbum({ artistId: '1', title: 'T', year: '2020' }), 'submitCatalogAlbum', { artistId: '1', title: 'T', year: '2020' }],
    ['updateMyCatalogEntry', () => catalog.updateMyEntry({ kind: 'artist', id: '1', name: 'N' }), 'updateMyCatalogEntry', { kind: 'artist', id: '1', name: 'N' }],
    ['withdrawMyCatalogEntry', () => catalog.withdrawMyEntry('album', '2'), 'withdrawMyCatalogEntry', { kind: 'album', id: '2' }],
    ['adminCreateCatalogArtist', () => catalog.adminCreateArtist({ name: 'A', disambiguation: 'uk' }), 'adminCreateCatalogArtist', { name: 'A', disambiguation: 'uk' }],
    ['adminCreateCatalogAlbum', () => catalog.adminCreateAlbum({ artistId: '1', title: 'T' }), 'adminCreateCatalogAlbum', { artistId: '1', title: 'T' }],
    ['adminUpdateCatalogEntry', () => catalog.adminUpdate({ kind: 'artist', id: '1', disambiguation: 'x' }), 'adminUpdateCatalogEntry', { kind: 'artist', id: '1', disambiguation: 'x' }],
    ['adminDeleteCatalogEntry', () => catalog.adminDelete('artist', '1', true), 'adminDeleteCatalogEntry', { kind: 'artist', id: '1', revokeCredit: true }],
  ])('%s sends the operation and variables', async (_n, run, op, vars) => {
    gqlRequest.mockResolvedValue({ [op]: true });
    await run();
    const c = call();
    expect(c.query).toContain(op);
    expect(c.vars).toEqual(vars);
  });

  it('reviewEntry forwards expectedUpdatedAt and the lowercase decision', async () => {
    gqlRequest.mockResolvedValue({ reviewCatalogEntry: true });
    await catalog.reviewEntry({ kind: 'artist', id: '1', decision: 'approve', note: 'ok', expectedUpdatedAt: '2026-01-01T00:00:00.000Z' });
    expect(call().vars).toEqual({ kind: 'artist', id: '1', decision: 'approve', note: 'ok', expectedUpdatedAt: '2026-01-01T00:00:00.000Z' });
  });

  it('queries unwrap their payload', async () => {
    gqlRequest.mockResolvedValueOnce({ myCatalogSubmissions: { artists: [], albums: [] } });
    await expect(catalog.getMySubmissions()).resolves.toEqual({ artists: [], albums: [] });
    gqlRequest.mockResolvedValueOnce({ catalogReviewQueue: { artists: [], albums: [] } });
    await expect(catalog.getReviewQueue()).resolves.toEqual({ artists: [], albums: [] });
    gqlRequest.mockResolvedValueOnce({ catalogAdminArtists: [{ id: '1' }] });
    await expect(catalog.adminListArtists({ query: 'x', offset: 0, limit: 10 })).resolves.toEqual([{ id: '1' }]);
    expect(gqlRequest.mock.calls[2][1]).toEqual({ query: 'x', offset: 0, limit: 10 });
    gqlRequest.mockResolvedValueOnce({ catalogAdminAlbums: [] });
    await catalog.adminListAlbums('7');
    expect(gqlRequest.mock.calls[3][1]).toEqual({ artistId: '7' });
  });

  it('the review queue and updatedAt are selected so reviewers can pass expectedUpdatedAt', async () => {
    gqlRequest.mockResolvedValue({ catalogReviewQueue: { artists: [], albums: [] } });
    await catalog.getReviewQueue();
    expect(call().query).toContain('updatedAt');
  });
});

describe('uploadCatalogImage', () => {
  const img = (size = 10, type = 'image/png') => new File([new Uint8Array(size)], 'a.png', { type });

  it('rejects a non-image before any request', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    await expect(catalog.uploadCatalogImage(img(10, 'text/plain'))).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
    expect(f).not.toHaveBeenCalled();
  });

  it('rejects a file over 5 MB before any request', async () => {
    await expect(catalog.uploadCatalogImage(img(5 * 1024 * 1024 + 1))).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });

  it('signs, posts exactly the signed params, and returns the secure url', async () => {
    request.mockResolvedValue({ signature: 'sig', timestamp: 123, cloudName: 'c', apiKey: 'k', folder: 'catalog/u1', resourceType: 'image', transformation: 'c_fill,w_600' });
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ secure_url: 'https://res.cloudinary.com/c/image/upload/v1/catalog/u1/x.webp', public_id: 'p' }) });
    vi.stubGlobal('fetch', f);
    const url = await catalog.uploadCatalogImage(img(), 'tok');
    expect(url).toBe('https://res.cloudinary.com/c/image/upload/v1/catalog/u1/x.webp');
    const [path, init] = request.mock.calls[0];
    expect(path).toBe('/uploads/catalog-image-signature');
    expect(JSON.parse(init.body)).toMatchObject({ fileSize: 10, fileName: 'a.png', recaptchaToken: 'tok' });
    const [endpoint, post] = f.mock.calls[0];
    expect(endpoint).toBe('https://api.cloudinary.com/v1_1/c/image/upload');
    const fd = post.body as FormData;
    expect(fd.get('folder')).toBe('catalog/u1');
    expect(fd.get('transformation')).toBe('c_fill,w_600');
    expect(fd.get('signature')).toBe('sig');
  });
});

describe('catalogErrorCode', () => {
  it('reads the code off an ApiError', () => {
    expect(catalogErrorCode(Object.assign(new Error('x'), { code: 'catalog_duplicate' }))).toBe('catalog_duplicate');
  });
  it('falls back to graphqlErrors extensions.code', () => {
    expect(catalogErrorCode(Object.assign(new Error('x'), { graphqlErrors: [{ message: 'm', extensions: { code: 'catalog_changed' } }] }))).toBe('catalog_changed');
  });
  it('returns null for unknown values', () => {
    expect(catalogErrorCode(new Error('x'))).toBeNull();
    expect(catalogErrorCode('nope')).toBeNull();
    expect(catalogErrorCode(null)).toBeNull();
  });
});

describe('catalog permissions mirror', () => {
  it('knows catalog.review and catalog.manage', () => {
    expect(userHasPermission(['catalog.review'], 'catalog.review')).toBe(true);
    expect(userHasPermission(['catalog.review'], 'catalog.manage')).toBe(false);
    expect(userHasPermission(['*'], 'catalog.manage')).toBe(true);
  });
});

describe('catalog admin tools services', () => {
  it('searchGeniusArtists encodes the query and unwraps artists', async () => {
    const artists = [{ geniusId: 1, name: 'A', imageUrl: 'https://images.genius.com/x.jpg', url: 'https://genius.com/artists/A' }];
    request.mockResolvedValue({ artists });
    await expect(catalog.searchGeniusArtists('a&b c')).resolves.toEqual(artists);
    expect(request).toHaveBeenCalledWith('/catalog/genius/artists?q=a%26b%20c');
  });

  it('copyGeniusPhoto posts only the geniusId', async () => {
    request.mockResolvedValue({ imageUrl: 'https://res.cloudinary.com/x.jpg', sourceUrl: 'https://genius.com/artists/A' });
    await catalog.copyGeniusPhoto(42);
    expect(request).toHaveBeenCalledWith('/catalog/genius/photo', { method: 'POST', body: JSON.stringify({ geniusId: 42 }) });
  });

  it('detectAlbums queries catalogDetectAlbums with the artist id', async () => {
    gqlRequest.mockResolvedValue({ catalogDetectAlbums: [{ key: 'k', title: 'T', songCount: 2, year: null }] });
    await expect(catalog.detectAlbums('7')).resolves.toEqual([{ key: 'k', title: 'T', songCount: 2, year: null }]);
    expect(call().query).toContain('catalogDetectAlbums');
    expect(call().vars).toEqual({ artistId: '7' });
  });

  it('approveDetectedAlbum forwards artistId, title and year', async () => {
    gqlRequest.mockResolvedValue({ approveDetectedAlbum: { id: 'a1' } });
    await expect(catalog.approveDetectedAlbum({ artistId: '7', title: 'T', year: '2020' })).resolves.toEqual({ id: 'a1' });
    expect(call().query).toContain('approveDetectedAlbum');
    expect(call().vars).toEqual({ artistId: '7', title: 'T', year: '2020' });
  });

  it('dismissDetectedAlbum forwards artistId and key', async () => {
    gqlRequest.mockResolvedValue({ dismissDetectedAlbum: true });
    await expect(catalog.dismissDetectedAlbum('7', 'k')).resolves.toBe(true);
    expect(call().query).toContain('dismissDetectedAlbum');
    expect(call().vars).toEqual({ artistId: '7', key: 'k' });
  });

  it('detectArtists queries catalogDetectArtists', async () => {
    gqlRequest.mockResolvedValue({ catalogDetectArtists: [{ key: 'k', name: 'N', songCount: 2 }] });
    await expect(catalog.detectArtists()).resolves.toEqual([{ key: 'k', name: 'N', songCount: 2 }]);
    expect(call().query).toContain('catalogDetectArtists');
  });

  it('approveDetectedArtist forwards the name', async () => {
    gqlRequest.mockResolvedValue({ approveDetectedArtist: { id: 'a1' } });
    await expect(catalog.approveDetectedArtist('N')).resolves.toEqual({ id: 'a1' });
    expect(call().query).toContain('approveDetectedArtist');
    expect(call().vars).toEqual({ name: 'N' });
  });

  it('dismissDetectedArtist forwards the key', async () => {
    gqlRequest.mockResolvedValue({ dismissDetectedArtist: true });
    await expect(catalog.dismissDetectedArtist('k')).resolves.toBe(true);
    expect(call().query).toContain('dismissDetectedArtist');
    expect(call().vars).toEqual({ key: 'k' });
  });

  it('adminUpdate and adminCreateArtist forward imageSource and imageSourceUrl', async () => {
    gqlRequest.mockResolvedValue({ adminUpdateCatalogEntry: true });
    await catalog.adminUpdate({ kind: 'artist', id: '1', imageSource: 'genius', imageSourceUrl: 'https://genius.com/artists/A' });
    expect(call().query).toContain('$imageSource: CatalogImageSource');
    expect(call().query).toContain('imageSourceUrl: $imageSourceUrl');
    expect(call().vars).toEqual({ kind: 'artist', id: '1', imageSource: 'genius', imageSourceUrl: 'https://genius.com/artists/A' });
    gqlRequest.mockReset();
    gqlRequest.mockResolvedValue({ adminCreateCatalogArtist: { id: '1' } });
    await catalog.adminCreateArtist({ name: 'A', imageSource: 'upload', imageSourceUrl: null });
    expect(call().query).toContain('$imageSource: CatalogImageSource');
    expect(call().vars).toEqual({ name: 'A', imageSource: 'upload', imageSourceUrl: null });
  });

  it('artist fields and the public page select the photo source', async () => {
    gqlRequest.mockResolvedValue({ catalogReviewQueue: { artists: [], albums: [] } });
    await catalog.getReviewQueue();
    expect(call().query).toContain('imageSource imageSourceUrl');
    gqlRequest.mockReset();
    gqlRequest.mockResolvedValue({ catalogArtist: null });
    await catalog.getCatalogArtist('a');
    expect(call().query).toContain('imageSourceUrl');
  });

  it('catalogErrorCode reads the REST body code, not the message in err.code', () => {
    const err = Object.assign(new Error('Genius is down'), { status: 503, code: 'Genius is down', body: { error: 'Genius is down', code: 'catalog_genius_unavailable' } });
    expect(catalogErrorCode(err)).toBe('catalog_genius_unavailable');
  });
});
