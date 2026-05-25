import { useEffect, useRef } from 'react';
import { getSocket } from '@/app/socket.client';

/**
 * Joins a project room and applies live server-pushed updates to editor state.
 *
 * @param {string|null} projectId - The shared project ID to listen on. Pass null to skip.
 * @param {{ setLines, setSyncMode, setActiveLineIndex, setRestoredPosition, setRestoredSpeed }} setters
 */
export function useProjectSocket(projectId, setters) {
  const settersRef = useRef(setters);
  settersRef.current = setters;

  useEffect(() => {
    if (!projectId) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('join:project', projectId);

    function onConnect() {
      socket.emit('join:project', projectId);
    }

    function onProjectUpdated(data) {
      const s = settersRef.current;
      if (data.lyrics?.lines) s.setLines(data.lyrics.lines);
      if (data.state?.syncMode !== undefined) s.setSyncMode(data.state.syncMode);
      if (typeof data.state?.activeLineIndex === 'number') s.setActiveLineIndex(data.state.activeLineIndex);
      if (typeof data.state?.playbackPosition === 'number') s.setRestoredPosition(data.state.playbackPosition);
      if (typeof data.state?.playbackSpeed === 'number') s.setRestoredSpeed(data.state.playbackSpeed);
    }

    socket.on('connect', onConnect);
    socket.on('project:updated', onProjectUpdated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('project:updated', onProjectUpdated);
      socket.emit('leave:project', projectId);
    };
  }, [projectId]);
}
