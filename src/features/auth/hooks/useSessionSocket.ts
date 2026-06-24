import { useEffect } from 'react';
import { getSocket } from '@/app/socket.client';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { presenceStore } from '@/features/auth/presence.store';
import { ROLE_RANK } from '@/features/auth/permissions';

const STAFF_RANK = ROLE_RANK['mod'] ?? 2;

export function useSessionSocket() {
  const { user, logout } = useAuthContext();
  const userId = user?.id;
  const isStaff = user?.role ? (ROLE_RANK[user.role as keyof typeof ROLE_RANK] ?? 0) >= STAFF_RANK : false;

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !userId) return;

    function joinRooms() {
      socket!.emit('join:user', userId);
      if (isStaff) socket!.emit('join:admin');
    }

    if (socket.connected) {
      joinRooms();
    }

    function onConnect() {
      joinRooms();
    }

    function onBanned() {
      logout();
    }

    function onRevoked() {
      logout();
    }

    function onPresenceInit({ onlineUserIds }: { onlineUserIds: string[] }) {
      presenceStore.init(onlineUserIds);
    }

    function onPresenceOnline({ userId: uid }: { userId: string }) {
      presenceStore.add(uid);
    }

    function onPresenceOffline({ userId: uid }: { userId: string }) {
      presenceStore.remove(uid);
    }

    socket.on('connect', onConnect);
    socket.on('user:banned', onBanned);
    socket.on('session:revoked', onRevoked);
    socket.on('presence:init', onPresenceInit);
    socket.on('presence:online', onPresenceOnline);
    socket.on('presence:offline', onPresenceOffline);

    return () => {
      socket.off('connect', onConnect);
      socket.off('user:banned', onBanned);
      socket.off('session:revoked', onRevoked);
      socket.off('presence:init', onPresenceInit);
      socket.off('presence:online', onPresenceOnline);
      socket.off('presence:offline', onPresenceOffline);
    };
  }, [userId, isStaff, logout]);
}
