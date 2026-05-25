import { useEffect } from 'react';
import { getSocket } from '@/app/socket.client';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function useSessionSocket() {
  const { user, logout } = useAuth();

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user?.id) return;

    socket.emit('join:user', user.id);

    function onConnect() {
      socket.emit('join:user', user.id);
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
  }, [user?.id, logout]);
}
