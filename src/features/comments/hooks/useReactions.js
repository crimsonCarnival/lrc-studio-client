import { useState, useEffect, useCallback } from 'react';
import { connectSocket } from '@/app/socket.client';
import { fetchProjectReactions, reactProject } from '../comments.service.js';

export function useProjectReactions(projectId) {
  const [reactions, setReactions] = useState([]);
  const [myReaction, setMyReaction] = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!projectId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetchProjectReactions(projectId)
      .then(result => {
        if (cancelled) return;
        setReactions(result.reactions);
        setMyReaction(result.myReaction);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    const socket = connectSocket();

    if (projectId) {
      socket.emit('join:project', projectId);
    }

    const onReactionUpdate = ({ targetType, targetId, reactions: updated }) => {
      if (targetType === 'project' && targetId === projectId) {
        setReactions(updated);
      }
    };

    socket.on('reaction:update', onReactionUpdate);
    return () => {
      socket.off('reaction:update', onReactionUpdate);
      if (projectId) socket.emit('leave:project', projectId);
    };
  }, [projectId]);

  const react = useCallback(async (emoji) => {
    const prevReactions = reactions;
    const prevMyReaction = myReaction;

    const isToggleOff = myReaction === emoji;
    setMyReaction(isToggleOff ? null : emoji);
    setReactions(prev => {
      if (isToggleOff) {
        return prev.flatMap(r => {
          const next = r.emoji === emoji ? { ...r, count: r.count - 1 } : r;
          return next.count > 0 ? [next] : [];
        });
      }
      const existing = prev.find(r => r.emoji === emoji);
      const removed = myReaction
        ? prev.flatMap(r => {
            const next = r.emoji === myReaction ? { ...r, count: r.count - 1 } : r;
            return next.count > 0 ? [next] : [];
          })
        : prev;
      if (existing) {
        return removed.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r);
      }
      return [...removed, { emoji, count: 1 }];
    });

    try {
      const result = await reactProject(projectId, emoji);
      setReactions(result.reactions);
      setMyReaction(result.myReaction);
    } catch {
      setReactions(prevReactions);
      setMyReaction(prevMyReaction);
    }
  }, [projectId, reactions, myReaction]);

  return { reactions, myReaction, loading, react };
}
