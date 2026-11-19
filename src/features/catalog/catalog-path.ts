/** The public catalog index: every approved artist, with search. */
export const CATALOG_BROWSE_PATH = '/artists';

/** The shared catalog page of an approved artist, addressed by slug. */
export function catalogArtistPath(slug: string): string {
  return `/artists/${encodeURIComponent(slug)}`;
}

/** The shared page of an approved album, under its artist's page. */
export function catalogAlbumPath(artistSlug: string, albumSlug: string): string {
  return `${catalogArtistPath(artistSlug)}/albums/${encodeURIComponent(albumSlug)}`;
}
