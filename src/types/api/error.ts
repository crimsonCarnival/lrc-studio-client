/**
 * Shape of the Error thrown by the REST `request()` helper (api.client.js) and
 * the `gqlRequest()` helper (graphql.client.js) on a failed call. Both attach
 * these fields onto a standard Error instance.
 *
 * `code` is the backend's machine-readable error string (e.g. 'sudo_required',
 * 'invalid_password'); UI logic branches on it. `status` is the HTTP status.
 */
export interface ApiError extends Error {
  /** HTTP status code of the failed response. */
  status?: number;
  /** Backend machine-readable error code, from the JSON body's `error` field. */
  code?: string;
  /** Raw parsed JSON error body, when present. */
  body?: unknown;
  /** Populated by gqlRequest for GraphQL-level (non-HTTP) errors. */
  graphqlErrors?: Array<{ message: string; extensions?: { code?: string } }>;
}

/**
 * Narrows an unknown caught value to ApiError. Use in catch blocks instead of
 * casting: `if (isApiError(err) && err.code === 'sudo_required') ...`.
 */
export function isApiError(err: unknown): err is ApiError {
  return err instanceof Error && ('status' in err || 'code' in err || 'graphqlErrors' in err);
}
