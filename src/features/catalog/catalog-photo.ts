export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** What the user wants for the entry's image: leave it, replace it with a framed file, or clear it. */
export type PhotoState = { kind: 'unchanged' } | { kind: 'new'; file: File } | { kind: 'remove' };
export const UNCHANGED: PhotoState = { kind: 'unchanged' };
