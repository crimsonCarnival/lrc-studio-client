import { useEffect } from 'react';
import { getSocket } from '@/app/socket.client';
import { useAuthContext } from '@/features/auth/useAuthContext';

export function useSessionSocket() {
  const { user, logout } = useAuthContext();
  const userId = user?.id;

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !userId) return;

    // Immediately join the user room if already connected.
    if (socket.connected) {
      socket.emit('join:user', userId);
    }

    // Re-join the user room on every (re)connect — Socket.IO fires the
    // 'connect' event both on the initial connection and after each
    // successful reconnect, so this handles both cases.
    function onConnect() {
      socket!.emit('join:user', userId);
    }

    function onBanned() {
      logout();
    }

    function onRevoked() {
      logout();
    }

    socket.on('connect', onConnect);
    socket.on('user:banned', onBanned);
    socket.on('session:revoked', onRevoked);

    return () => {
      socket.off('connect', onConnect);
      socket.off('user:banned', onBanned);
      socket.off('session:revoked', onRevoked);
    };
  }, [userId, logout]);
}
