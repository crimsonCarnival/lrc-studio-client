/**
 * Asks Google's image CDN for a larger rendition. Google profile photos are stored as
 * `...=s96-c`, which looks tiny in the full-size viewer; other URLs pass through untouched.
 */
export function enlargeAvatarUrl(url: string, size = 512): string {
  if (!/^https:\/\/lh\d+\.googleusercontent\.com\//.test(url)) return url;
  if (/=s\d+(-c)?$/.test(url)) return url.replace(/=s\d+(-c)?$/, `=s${size}-c`);
  if (/\/s\d+-c\//.test(url)) return url.replace(/\/s\d+-c\//, `/s${size}-c/`);
  return url;
}
