export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * What the user wants for the entry's image: leave it, replace it with a framed file, take a photo already
 * copied from Genius (admin artist dialog only; `url` is our Cloudinary copy, `sourceUrl` the Genius page), or clear it.
 */
export type PhotoState =
  | { kind: 'unchanged' }
  | { kind: 'new'; file: File }
  | { kind: 'genius'; url: string; sourceUrl: string }
  | { kind: 'remove' };
export const UNCHANGED: PhotoState = { kind: 'unchanged' };
