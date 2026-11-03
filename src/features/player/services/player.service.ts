/**
 * Pure utility functions for the Player component.
 */

/** A YouTube watch / embed / shorts / youtu.be URL; group 1 is the 11-character video id. */
export const YT_PATTERN = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|watch\?.+&v=)|youtu\.be\/)([^&?/\s]{11})/;

/** A Cloudinary delivery URL (the player loads these as audio from the CDN). */
export const CDN_PATTERN = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\//;

/**
 * Extract a YouTube video ID from a URL or bare ID string.
 */
export function extractVideoId(url: string): string | null {
  if (typeof url !== 'string') return null;
  const patterns = [
    YT_PATTERN,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}
