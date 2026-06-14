import { getDeviceId } from '@/shared/utils/device';
import { authEvents } from '@/shared/utils/auth-events';

const GQL_ENDPOINT = (import.meta.env.VITE_API_URL || '/api') + '/graphql';

/**
 * Executes a GraphQL request with automatic authentication and device identification.
 * @param {string} query - GraphQL query or mutation string.
 * @param {object} variables - Query variables.
 * @param {{ signal?: AbortSignal, headers?: Record<string,string> }} options
 * @returns {Promise<any>} The `data` field from the GraphQL response.
 */
export async function gqlRequest(query, variables = {}, { signal, headers: extraHeaders } = {}) {
  const deviceId = await getDeviceId();
  const headers = {
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
    const err = new Error(json.errors?.[0]?.message || `GraphQL request failed: ${res.status}`);
    err.status = res.status;
    err.graphqlErrors = json.errors;
    if (res.status === 401) authEvents.emit('token:expired');
    throw err;
  }

  if (json.errors?.length) {
    const gqlErr = json.errors[0];
    const err = new Error(gqlErr.message);
    err.code = gqlErr.extensions?.code;
    err.graphqlErrors = json.errors;
    throw err;
  }

  return json.data;
}

