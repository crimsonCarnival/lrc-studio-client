import { io, Socket } from 'socket.io-client';

let _socket: Socket | null = null;

export function connectSocket(): Socket {
  if (_socket?.connected) return _socket;

  const apiUrl = (import.meta).env.VITE_API_URL || '/api';
  _socket = io(apiUrl, {
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
