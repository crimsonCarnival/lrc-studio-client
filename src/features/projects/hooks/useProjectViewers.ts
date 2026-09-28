import { useEffect, useState } from 'react';
import { connectSocket } from '@/app/socket.client';

export type ProjectViewer = {
  userId: string;
  accountName: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

type RosterPayload = {
  publicId: string;
  viewers: ProjectViewer[];
  anonymousCount: number;
};

/**
 * Announces this viewer's presence on a public project page, and — for the
 * project's owner only — subscribes to the live roster of who else is here.
 *
 * Every viewer joins; only the owner watches. The server refuses a watch from
 * anyone else, so `isOwner` here is an optimisation and a UI gate, never the
 * security boundary.
 */
export function useProjectViewers(publicId: string | null | undefined, isOwner: boolean) {
  const [viewers, setViewers] = useState<ProjectViewer[]>([]);
  const [anonymousCount, setAnonymousCount] = useState(0);

  useEffect(() => {
    if (!publicId) return;
    const socket = connectSocket();
    if (!socket) return;

    const announce = () => {
      socket.emit('viewers:join', publicId);
      if (isOwner) socket.emit('viewers:watch', publicId);
    };

    const onRoster = (payload: RosterPayload) => {
      if (payload.publicId !== publicId) return;
      setViewers(payload.viewers);
      setAnonymousCount(payload.anonymousCount);
    };

    announce();
    // Re-announce after a reconnect: the server's registry is in-memory and
    // knows nothing about the socket that went away.
    socket.on('connect', announce);
    socket.on('viewers:update', onRoster);

    return () => {
      socket.off('connect', announce);
      socket.off('viewers:update', onRoster);
      socket.emit('viewers:leave', publicId);
      // Symmetric with viewers:watch above. Deps include isOwner, so this also
      // fires on an isOwner flip, not just on unmount/project change — the
      // owner-room subscription must be dropped in both cases.
      socket.emit('viewers:unwatch', publicId);
      setViewers([]);
      setAnonymousCount(0);
    };
  }, [publicId, isOwner]);

  return { viewers, anonymousCount };
}
