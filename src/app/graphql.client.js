import { getDeviceId } from '@/shared/utils/device';
import { authEvents } from '@/shared/utils/auth-events';

// Use the same base as the REST client — relative paths work fine with fetch + Vite proxy.
const GQL_ENDPOINT = (import.meta.env.VITE_API_URL || '/api') + '/graphql';

/**
 * Executes a GraphQL request with automatic authentication and device identification.
 * Uses fetch directly to support relative URLs (no URL constructor issues).
 * @param {string} query - GraphQL query or mutation string.
 * @param {object} variables - Query variables.
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
    credentials: 'include', // Automatically send HttpOnly cookies
    headers,
    body: JSON.stringify({ query, variables }),
    signal,
  });

  const json = await res.json().catch(() => ({}));

  // Surface HTTP-level errors
  if (!res.ok) {
    const err = new Error(json.errors?.[0]?.message || `GraphQL request failed: ${res.status}`);
    err.status = res.status;
    err.graphqlErrors = json.errors;

    // 401 means the access token was expired and the server detected it.
    // Signal the auth layer so it can refresh or log the user out.
    if (res.status === 401) {
      authEvents.emit('token:expired');
    }

    throw err;
  }

  // Surface GraphQL-level errors
  if (json.errors?.length) {
    const err = new Error(json.errors[0].message);
    err.graphqlErrors = json.errors;
    throw err;
  }

  return json.data;
}

