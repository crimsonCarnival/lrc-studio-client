import { io, Socket } from 'socket.io-client';

let _socket: Socket | null = null;

export function connectSocket(): Socket {
  if (_socket) return _socket;

  // In dev, Vite proxies /socket.io → localhost:3000, so use same origin.
  // In prod, socket server is on a different origin.
  const serverUrl = import.meta.env.PROD
    ? import.meta.env.VITE_SERVER_ORIGIN
    : window.location.origin;

  _socket = io(serverUrl, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    autoConnect: true,
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
