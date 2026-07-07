import { getDeviceId } from '@/shared/utils/device';
import { authEvents } from '@/shared/utils/auth-events';
import type { ApiError } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

let isLoggedIn = false;

export function setAuthFlag(val: unknown): void {
  isLoggedIn = !!val;
}

// Backward-compatibility alias for synchronous auth checks
export function getAccessToken(): boolean {
  return isLoggedIn;
}

export function setAccessToken(token: unknown): void {
  isLoggedIn = !!token;
}

export function clearAccessToken(): void {
  isLoggedIn = false;
}

/**
 * Performs an authenticated REST request. Cookies (HttpOnly) and the device id
 * are always sent. On a non-2xx response it throws an {@link ApiError} carrying
 * `status`/`code`/`body`. Callers annotate the resolved type:
 *   const me = await request<MeResponse>('/auth/me');
 *
 * Returns `null` for 204 / empty / non-JSON success bodies.
 */
export async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T | null> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Always send device identifier
  headers['X-Device-Id'] = await getDeviceId();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include', // Automatically send HttpOnly cookies
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Request failed: ${res.status}`) as ApiError;
    err.status = res.status;
    err.code = body.error;
    err.body = body;
    // 401 means the access token cookie expired or is missing — signal the auth layer
    if (res.status === 401) {
      authEvents.emit('token:expired');
    }
    throw err;
  }

  if (res.status === 204) return null;
  // Tolerate empty/non-JSON success bodies (e.g. a 200 with no content from an
  // upstream that failed silently) instead of throwing "Unexpected end of JSON input".
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
