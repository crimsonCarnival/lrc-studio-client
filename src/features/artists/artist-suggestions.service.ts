import { gqlRequest } from '@/app/graphql.client';

const MY_ARTIST_SUGGESTIONS = /* GraphQL */ `
  query MyArtistSuggestions($prefix: String!, $limit: Int, $offset: Int) {
    myArtistSuggestions(prefix: $prefix, limit: $limit, offset: $offset) {
      total
      items { id name }
    }
  }
`;

export interface ArtistSuggestion { id: string; name: string }
export interface ArtistSuggestionPage { total: number; items: ArtistSuggestion[] }

/** The server caps `limit` at 20. */
export const SUGGESTION_LIMIT = 10;

/**
 * Names the signed-in user has credited before, by case-insensitive prefix, A to Z. Own
 * library only. Pass an AbortSignal to drop a stale request.
 */
export async function fetchArtistSuggestions(
  prefix: string,
  { limit = SUGGESTION_LIMIT, offset = 0, signal }: { limit?: number; offset?: number; signal?: AbortSignal } = {},
): Promise<ArtistSuggestionPage> {
  const data = await gqlRequest<{ myArtistSuggestions: ArtistSuggestionPage | null }>(
    MY_ARTIST_SUGGESTIONS,
    { prefix, limit: Math.min(limit, 20), offset },
    { signal },
  );
  return data?.myArtistSuggestions ?? { total: 0, items: [] };
}
