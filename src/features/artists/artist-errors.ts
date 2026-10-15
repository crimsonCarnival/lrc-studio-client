import type { TFunction } from 'i18next';
import type { ArtistValidationCode } from '@/shared/utils/artists';

/** Server error codes that concern artists or the project's identity. */
export const ARTIST_ERROR_CODES = [
  'artists_invalid',
  'artist_role_invalid',
  'artist_name_empty',
  'artist_name_too_long',
  'artists_too_many',
  'artist_duplicate',
  'artist_primary_required',
  'project_identity_required',
] as const;

export type ArtistErrorCode = (typeof ARTIST_ERROR_CODES)[number];

const isArtistErrorCode = (code: unknown): code is ArtistErrorCode =>
  typeof code === 'string' && (ARTIST_ERROR_CODES as readonly string[]).includes(code);

/** The machine-readable code of a failed GraphQL or REST call, wherever the client helper put it. */
export function errorCodeOf(err: unknown): string | undefined {
  const e = err as {
    code?: string;
    graphqlErrors?: Array<{ extensions?: { code?: string } }>;
    body?: { code?: string };
  } | null;
  return e?.graphqlErrors?.[0]?.extensions?.code ?? e?.body?.code ?? e?.code;
}

/** The artist error an API failure carries, or null when it is some other failure. */
export function artistErrorCodeOf(err: unknown): ArtistErrorCode | null {
  const code = errorCodeOf(err);
  return isArtistErrorCode(code) ? code : null;
}

/**
 * Localised message for an artist error. `values` fills `{{name}}` (artist_duplicate) and the limits.
 * Returns null for any other error so the caller can show its own generic message.
 */
export function artistErrorMessage(
  t: TFunction,
  code: ArtistErrorCode | ArtistValidationCode,
  values: { name?: string; max?: number } = {},
): string {
  return (t as (k: string, o?: object) => string)(`artists.errors.${code}`, values);
}

export function artistErrorMessageFor(t: TFunction, err: unknown, values?: { name?: string; max?: number }): string | null {
  const code = artistErrorCodeOf(err);
  return code ? artistErrorMessage(t, code, values) : null;
}
