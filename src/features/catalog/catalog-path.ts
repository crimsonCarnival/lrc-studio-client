/** The shared catalog page of an approved artist, addressed by slug. */
export function catalogArtistPath(slug: string): string {
  return `/artists/${encodeURIComponent(slug)}`;
}
