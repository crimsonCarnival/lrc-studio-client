import { io, Socket } from 'socket.io-client';

let _socket: Socket | null = null;

export function connectSocket(): Socket {
  // If we already have a socket instance that is connected or actively trying to
  // connect, reuse it. If the instance is stale/disconnected (e.g. after a
  // server restart), call connect() to re-establish — do NOT create a new io()
  // instance, as that would leave the old one dangling.
  if (_socket) {
    if (_socket.connected || _socket.active) return _socket;
    // Socket exists but is disconnected — re-establish the connection.
    _socket.connect();
    return _socket;
  }

  // In dev, Vite proxies /socket.io → localhost:3000, so use same origin.
  // In prod, VITE_SERVER_ORIGIN must be set to the backend URL (e.g. https://lrc-editor-server.onrender.com).
  const serverUrl = import.meta.env.PROD
    ? (import.meta.env.VITE_SERVER_ORIGIN as string)
    : window.location.origin;

  if (import.meta.env.PROD && !serverUrl) {
    console.error('[socket] VITE_SERVER_ORIGIN is not set — socket will not connect');
  }

  _socket = io(serverUrl, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    autoConnect: true,
    // Reconnection settings — ensure client aggressively retries after a
    // server restart without user intervention.
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  return _socket;
}

export function disconnectSocket(): void {
  _socket?.disconnect();
  _socket = null;
}

export function getSocket(): Socket | null {
  return _socket;
}
