import { gqlRequest } from '@/app/graphql.client';
import { request } from '@/app/api.client';
import { isApiError } from '@/types';
import { PROJECT_LIST_FIELDS } from '@/features/projects/services/projects.service';
import type {
  AdminCatalogEntryEdit,
  CatalogAlbum,
  CatalogArtist,
  CatalogArtistPage,
  CatalogEntryEdit,
  CatalogImageSource,
  CatalogKind,
  DetectedAlbum,
  GeniusArtistMatch,
  GeniusPhoto,
  CatalogQueue,
  ReviewInput,
} from './catalog.types';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// `updatedAt` is selected everywhere: reviewers echo it back as `expectedUpdatedAt`.
const SUBMITTER = 'submittedBy { id accountName displayName avatarUrl }';
const ARTIST_FIELDS = `id name disambiguation slug imageUrl imageSource imageSourceUrl bio status source reviewNote createdAt updatedAt ${SUBMITTER}`;
const ALBUM_FIELDS = `id artistId title slug year coverUrl status source reviewNote createdAt updatedAt ${SUBMITTER}`;

/**
 * The server's lower-cased code (e.g. `catalog_duplicate`), or null when there is none.
 * REST failures put the message in `err.code` and the machine code in `body.code`, so the body wins.
 */
export function catalogErrorCode(err: unknown): string | null {
  if (!isApiError(err)) return null;
  const bodyCode = (err.body as { code?: unknown } | null | undefined)?.code;
  if (typeof bodyCode === 'string') return bodyCode;
  return err.code ?? err.graphqlErrors?.[0]?.extensions?.code ?? null;
}

/** The existing entry a `catalog_duplicate` error points at, when the server revealed one. */
export function catalogDuplicateOf(err: unknown): { id: string; name: string; slug: string } | null {
  if (!isApiError(err)) return null;
  const existing = err.graphqlErrors?.[0]?.extensions?.existing as { id?: string; name?: string; slug?: string } | undefined;
  return existing?.id && existing.name && existing.slug ? { id: existing.id, name: existing.name, slug: existing.slug } : null;
}

export async function submitCatalogArtist(input: { name: string; bio?: string; imageUrl?: string }): Promise<CatalogArtist> {
  const data = await gqlRequest<{ submitCatalogArtist: CatalogArtist }>(/* GraphQL */ `
    mutation SubmitCatalogArtist($name: String!, $bio: String, $imageUrl: String) {
      submitCatalogArtist(name: $name, bio: $bio, imageUrl: $imageUrl) { ${ARTIST_FIELDS} }
    }
  `, input);
  return data.submitCatalogArtist;
}

export async function submitCatalogAlbum(input: { artistId: string; title: string; year?: string; coverUrl?: string }): Promise<CatalogAlbum> {
  const data = await gqlRequest<{ submitCatalogAlbum: CatalogAlbum }>(/* GraphQL */ `
    mutation SubmitCatalogAlbum($artistId: ID!, $title: String!, $year: String, $coverUrl: String) {
      submitCatalogAlbum(artistId: $artistId, title: $title, year: $year, coverUrl: $coverUrl) { ${ALBUM_FIELDS} }
    }
  `, input);
  return data.submitCatalogAlbum;
}

export async function getMySubmissions(): Promise<CatalogQueue> {
  const data = await gqlRequest<{ myCatalogSubmissions: CatalogQueue }>(/* GraphQL */ `
    query MyCatalogSubmissions {
      myCatalogSubmissions {
        artists { ${ARTIST_FIELDS} }
        albums { ${ALBUM_FIELDS} }
      }
    }
  `);
  return data.myCatalogSubmissions;
}

export async function updateMyEntry(input: CatalogEntryEdit): Promise<boolean> {
  const data = await gqlRequest<{ updateMyCatalogEntry: boolean }>(/* GraphQL */ `
    mutation UpdateMyCatalogEntry($kind: CatalogKind!, $id: ID!, $name: String, $title: String, $bio: String, $imageUrl: String, $year: String, $coverUrl: String) {
      updateMyCatalogEntry(kind: $kind, id: $id, name: $name, title: $title, bio: $bio, imageUrl: $imageUrl, year: $year, coverUrl: $coverUrl)
    }
  `, input);
  return data.updateMyCatalogEntry;
}

export async function withdrawMyEntry(kind: CatalogKind, id: string): Promise<boolean> {
  const data = await gqlRequest<{ withdrawMyCatalogEntry: boolean }>(/* GraphQL */ `
    mutation WithdrawMyCatalogEntry($kind: CatalogKind!, $id: ID!) {
      withdrawMyCatalogEntry(kind: $kind, id: $id)
    }
  `, { kind, id });
  return data.withdrawMyCatalogEntry;
}

export async function getReviewQueue(): Promise<CatalogQueue> {
  const data = await gqlRequest<{ catalogReviewQueue: CatalogQueue }>(/* GraphQL */ `
    query CatalogReviewQueue {
      catalogReviewQueue {
        artists { ${ARTIST_FIELDS} }
        albums { ${ALBUM_FIELDS} }
      }
    }
  `);
  return data.catalogReviewQueue;
}

export async function reviewEntry(input: ReviewInput): Promise<boolean> {
  const data = await gqlRequest<{ reviewCatalogEntry: boolean }>(/* GraphQL */ `
    mutation ReviewCatalogEntry($kind: CatalogKind!, $id: ID!, $decision: CatalogDecision!, $note: String, $expectedUpdatedAt: String) {
      reviewCatalogEntry(kind: $kind, id: $id, decision: $decision, note: $note, expectedUpdatedAt: $expectedUpdatedAt)
    }
  `, input);
  return data.reviewCatalogEntry;
}

export async function adminListArtists(args: { query?: string; offset?: number; limit?: number } = {}): Promise<CatalogArtist[]> {
  const data = await gqlRequest<{ catalogAdminArtists: CatalogArtist[] }>(/* GraphQL */ `
    query CatalogAdminArtists($query: String, $offset: Int, $limit: Int) {
      catalogAdminArtists(query: $query, offset: $offset, limit: $limit) { ${ARTIST_FIELDS} }
    }
  `, args);
  return data.catalogAdminArtists;
}

export async function adminListAlbums(artistId: string): Promise<CatalogAlbum[]> {
  const data = await gqlRequest<{ catalogAdminAlbums: CatalogAlbum[] }>(/* GraphQL */ `
    query CatalogAdminAlbums($artistId: ID!) {
      catalogAdminAlbums(artistId: $artistId) { ${ALBUM_FIELDS} }
    }
  `, { artistId });
  return data.catalogAdminAlbums;
}

export async function adminCreateArtist(input: { name: string; disambiguation?: string; bio?: string; imageUrl?: string; imageSource?: CatalogImageSource | null; imageSourceUrl?: string | null }): Promise<CatalogArtist> {
  const data = await gqlRequest<{ adminCreateCatalogArtist: CatalogArtist }>(/* GraphQL */ `
    mutation AdminCreateCatalogArtist($name: String!, $disambiguation: String, $bio: String, $imageUrl: String, $imageSource: CatalogImageSource, $imageSourceUrl: String) {
      adminCreateCatalogArtist(name: $name, disambiguation: $disambiguation, bio: $bio, imageUrl: $imageUrl, imageSource: $imageSource, imageSourceUrl: $imageSourceUrl) { ${ARTIST_FIELDS} }
    }
  `, input);
  return data.adminCreateCatalogArtist;
}

export async function adminCreateAlbum(input: { artistId: string; title: string; year?: string; coverUrl?: string }): Promise<CatalogAlbum> {
  const data = await gqlRequest<{ adminCreateCatalogAlbum: CatalogAlbum }>(/* GraphQL */ `
    mutation AdminCreateCatalogAlbum($artistId: ID!, $title: String!, $year: String, $coverUrl: String) {
      adminCreateCatalogAlbum(artistId: $artistId, title: $title, year: $year, coverUrl: $coverUrl) { ${ALBUM_FIELDS} }
    }
  `, input);
  return data.adminCreateCatalogAlbum;
}

export async function adminUpdate(input: AdminCatalogEntryEdit): Promise<boolean> {
  const data = await gqlRequest<{ adminUpdateCatalogEntry: boolean }>(/* GraphQL */ `
    mutation AdminUpdateCatalogEntry($kind: CatalogKind!, $id: ID!, $name: String, $disambiguation: String, $title: String, $bio: String, $imageUrl: String, $year: String, $coverUrl: String, $imageSource: CatalogImageSource, $imageSourceUrl: String) {
      adminUpdateCatalogEntry(kind: $kind, id: $id, name: $name, disambiguation: $disambiguation, title: $title, bio: $bio, imageUrl: $imageUrl, year: $year, coverUrl: $coverUrl, imageSource: $imageSource, imageSourceUrl: $imageSourceUrl)
    }
  `, input);
  return data.adminUpdateCatalogEntry;
}

/** Sudo-protected: fails with code `SUDO_REQUIRED` until the admin re-authenticates. */
export async function adminDelete(kind: CatalogKind, id: string, revokeCredit?: boolean): Promise<boolean> {
  const data = await gqlRequest<{ adminDeleteCatalogEntry: boolean }>(/* GraphQL */ `
    mutation AdminDeleteCatalogEntry($kind: CatalogKind!, $id: ID!, $revokeCredit: Boolean) {
      adminDeleteCatalogEntry(kind: $kind, id: $id, revokeCredit: $revokeCredit)
    }
  `, { kind, id, revokeCredit });
  return data.adminDeleteCatalogEntry;
}

type CatalogSignature = {
  signature: string;
  timestamp: string | number;
  cloudName: string;
  apiKey: string;
  folder: string;
  resourceType: string;
  transformation?: string;
};

/**
 * Uploads a catalog image (artist photo / album cover) and returns Cloudinary's canonical `secure_url`.
 * Posts exactly the signed params (folder + transformation) or Cloudinary rejects the signature.
 * Pass a reCAPTCHA token for action `upload_catalog_image`.
 */
export async function uploadCatalogImage(file: File, recaptchaToken?: string): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Not an image file');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Image too large. Max: 5 MB');

  const sig = (await request<CatalogSignature>('/uploads/catalog-image-signature', {
    method: 'POST',
    body: JSON.stringify({ fileSize: file.size, fileName: file.name, recaptchaToken }),
  }))!;

  const form = new FormData();
  form.append('file', file, file.name);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);
  if (sig.transformation) form.append('transformation', sig.transformation);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(sig.cloudName)}/${sig.resourceType}/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(body.error?.message || `Upload failed: ${res.status}`);
  }
  const data = await res.json() as { secure_url: string };
  return data.secure_url;
}

/** A public catalog artist with its approved albums; null when the slug is unknown or not approved. */
export async function getCatalogArtist(slug: string): Promise<CatalogArtistPage | null> {
  const data = await gqlRequest<{ catalogArtist: CatalogArtistPage | null }>(/* GraphQL */ `
    query CatalogArtist($slug: String!) {
      catalogArtist(slug: $slug) {
        artist { id name disambiguation slug imageUrl imageSource imageSourceUrl bio }
        albums { id artistId title slug year coverUrl }
        songs { ...ProjectListFields user { accountName } }
      }
    }
  ` + PROJECT_LIST_FIELDS, { slug });
  return data.catalogArtist;
}

/** Genius artists matching `q` (at most 5, each with a usable photo). Needs `catalog.manage`. */
export async function searchGeniusArtists(q: string): Promise<GeniusArtistMatch[]> {
  const data = await request<{ artists: GeniusArtistMatch[] }>(`/catalog/genius/artists?q=${encodeURIComponent(q)}`);
  return data?.artists ?? [];
}

/** Has the server copy a Genius artist photo to Cloudinary; returns the hosted URL and the Genius page it came from. */
export async function copyGeniusPhoto(geniusId: number): Promise<GeniusPhoto> {
  const data = await request<GeniusPhoto>('/catalog/genius/photo', { method: 'POST', body: JSON.stringify({ geniusId }) });
  if (!data) throw new Error('Empty response');
  return data;
}

/** Album titles found in songs crediting the artist (any visibility) that the catalog does not have yet. */
export async function detectAlbums(artistId: string): Promise<DetectedAlbum[]> {
  const data = await gqlRequest<{ catalogDetectAlbums: DetectedAlbum[] }>(/* GraphQL */ `
    query CatalogDetectAlbums($artistId: ID!) {
      catalogDetectAlbums(artistId: $artistId) { key title songCount year }
    }
  `, { artistId });
  return data.catalogDetectAlbums;
}

export async function approveDetectedAlbum(input: { artistId: string; title: string; year?: string | null }): Promise<CatalogAlbum> {
  const data = await gqlRequest<{ approveDetectedAlbum: CatalogAlbum }>(/* GraphQL */ `
    mutation ApproveDetectedAlbum($artistId: ID!, $title: String!, $year: String) {
      approveDetectedAlbum(artistId: $artistId, title: $title, year: $year) { ${ALBUM_FIELDS} }
    }
  `, input);
  return data.approveDetectedAlbum;
}

export async function dismissDetectedAlbum(artistId: string, key: string): Promise<boolean> {
  const data = await gqlRequest<{ dismissDetectedAlbum: boolean }>(/* GraphQL */ `
    mutation DismissDetectedAlbum($artistId: ID!, $key: String!) {
      dismissDetectedAlbum(artistId: $artistId, key: $key)
    }
  `, { artistId, key });
  return data.dismissDetectedAlbum;
}
