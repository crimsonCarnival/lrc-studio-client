import { useEffect, useLayoutEffect, useRef } from 'react';
import { getSocket } from '@/app/socket.client';
import { sectionsToFlat } from '@/features/editor/utils/sections';

interface ProjectSocketSetters {
  setLines: (lines: unknown[]) => void;
  setSyncMode: (sync: boolean) => void;
  setActiveLineIndex: (index: number) => void;
  setRestoredPosition: (position: number) => void;
  setRestoredSpeed: (speed: number) => void;
}

interface ProjectUpdatePayload {
  lyrics?: { sections?: unknown[] };
  state?: {
    syncMode?: boolean;
    activeLineIndex?: number;
    playbackPosition?: number;
    playbackSpeed?: number;
  };
}

/**
 * Joins a project room and applies live server-pushed updates to editor state.
 */
export function useProjectSocket(publicId: string | null, setters: ProjectSocketSetters) {
  const settersRef = useRef(setters);
  useLayoutEffect(() => { settersRef.current = setters; });

  useEffect(() => {
    if (!publicId) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('join:project', publicId);

    function onConnect() {
      socket!.emit('join:project', publicId);
    }

    function onProjectUpdated(data: ProjectUpdatePayload) {
      const s = settersRef.current;
      if (data.lyrics?.sections) s.setLines(sectionsToFlat(data.lyrics.sections));
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
      socket.emit('leave:project', publicId);
    };
  }, [publicId]);
}
