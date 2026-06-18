import { getDeviceId } from '@/shared/utils/device';
import { authEvents } from '@/shared/utils/auth-events';
import type { ApiError } from '@/types';

const GQL_ENDPOINT = (import.meta.env.VITE_API_URL || '/api') + '/graphql';

interface GqlOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/**
 * Executes a GraphQL request with automatic authentication and device
 * identification. Returns the `data` field of the response.
 *
 * The caller annotates the expected shape:
 *   const { me } = await gqlRequest<{ me: User | null }>(ME_QUERY);
 *
 * Throws an {@link ApiError} on HTTP failure or GraphQL-level errors.
 */
export async function gqlRequest<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
  { signal, headers: extraHeaders }: GqlOptions = {}
): Promise<T> {
  const deviceId = await getDeviceId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Device-Id': deviceId,
    ...extraHeaders,
  };

  const res = await fetch(GQL_ENDPOINT, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ query, variables }),
    signal,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(json.errors?.[0]?.message || `GraphQL request failed: ${res.status}`) as ApiError;
    err.status = res.status;
    err.graphqlErrors = json.errors;
    if (res.status === 401) authEvents.emit('token:expired');
    throw err;
  }

  if (json.errors?.length) {
    const gqlErr = json.errors[0];
    const err = new Error(gqlErr.message) as ApiError;
    err.code = gqlErr.extensions?.code;
    err.graphqlErrors = json.errors;
    throw err;
  }

  return json.data as T;
}
