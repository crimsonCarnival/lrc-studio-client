import { useEffect } from 'react';
import { connectSocket, getSocket } from '@/app/socket.client';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { presenceStore } from '@/features/auth/presence.store';
import type { UserActivity } from '@/features/auth/presence.store';
import { ROLE_RANK } from '@/features/auth/permissions';

const STAFF_RANK = ROLE_RANK['mod'] ?? 2;

export function useSessionSocket() {
  const { user, logout } = useAuthContext();
  const userId = user?.id;
  const isStaff = user?.role ? (ROLE_RANK[user.role as keyof typeof ROLE_RANK] ?? 0) >= STAFF_RANK : false;

  useEffect(() => {
    if (!userId) return;
    // connectSocket() rather than getSocket(): AppProviders only connects for a
    // signed-in session, and React runs child effects before parent ones, so on the
    // render where sign-in lands this would otherwise read null and never subscribe.
    // It is idempotent, and the guard above keeps guests from opening one.
    const socket = connectSocket();
    if (!socket) return;

    // A socket that connected before sign-in, or with an access token that had just expired,
    // is anonymous to the server, and joining its user room does nothing — every push is then
    // lost until a reload. The server answers join:user with whether it worked; when it
    // didn't, reconnect so the handshake reads the current cookie, backing off a few times
    // (a token refresh may land in between).
    const MAX_REJOINS = 3;
    let rejoins = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function joinRooms() {
      socket!.emit('join:user', (ok: boolean) => {
        if (ok) { rejoins = 0; return; }
        if (rejoins >= MAX_REJOINS) return;
        rejoins++;
        retryTimer = setTimeout(() => {
          socket!.disconnect();
          socket!.connect(); // fresh handshake; onConnect joins again
        }, 1000 * 2 ** (rejoins - 1));
      });
      if (isStaff) socket!.emit('join:admin');
    }

    if (socket.connected) joinRooms();

    function onConnect() { joinRooms(); }
    function onBanned() { logout(); }
    function onRevoked() { logout(); }

    function onPresenceInit({ onlineUserIds, activities = {} }: { onlineUserIds: string[]; activities?: Record<string, UserActivity> }) {
      presenceStore.init(onlineUserIds, activities);
    }
    function onPresenceOnline({ userId: uid }: { userId: string }) {
      presenceStore.add(uid);
    }
    function onPresenceOffline({ userId: uid }: { userId: string }) {
      presenceStore.remove(uid);
    }
    function onActivityUpdate({ userId: uid, activity }: { userId: string; activity: UserActivity }) {
      presenceStore.setActivity(uid, activity);
    }
    function onActivityClear({ userId: uid }: { userId: string }) {
      presenceStore.clearActivity(uid);
    }

    socket.on('connect', onConnect);
    socket.on('user:banned', onBanned);
    socket.on('session:revoked', onRevoked);
    socket.on('presence:init', onPresenceInit);
    socket.on('presence:online', onPresenceOnline);
    socket.on('presence:offline', onPresenceOffline);
    socket.on('activity:update', onActivityUpdate);
    socket.on('activity:clear', onActivityClear);

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      socket.off('connect', onConnect);
      socket.off('user:banned', onBanned);
      socket.off('session:revoked', onRevoked);
      socket.off('presence:init', onPresenceInit);
      socket.off('presence:online', onPresenceOnline);
      socket.off('presence:offline', onPresenceOffline);
      socket.off('activity:update', onActivityUpdate);
      socket.off('activity:clear', onActivityClear);
    };
  }, [userId, isStaff, logout]);
}

/** Emit activity status when user is actively working in a project. */
export function useEditorActivity(activity: UserActivity | null) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    if (activity) {
      socket.emit('activity:set', activity);
    } else {
      socket.emit('activity:clear');
    }

    return () => {
      socket.emit('activity:clear');
    };
  }, [activity?.projectTitle, activity?.songName, activity?.publicId]); // eslint-disable-line react-hooks/exhaustive-deps
}
