import { getDeviceId } from '@/shared/utils/device';
import { authEvents } from '@/shared/utils/auth-events';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

let isLoggedIn = false;

export function setAuthFlag(val) {
  isLoggedIn = !!val;
}


// Backward-compatibility alias for synchronous auth checks
export function getAccessToken() {
  return isLoggedIn;
}

export function setAccessToken(token) {
  isLoggedIn = !!token;
}

export function clearAccessToken() {
  isLoggedIn = false;
}

export async function request(path, options = {}) {
  const headers = { ...options.headers };

  if (options.body) {
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
    const err = new Error(body.error || `Request failed: ${res.status}`);
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
  return res.json();
}
