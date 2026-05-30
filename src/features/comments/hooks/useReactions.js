import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '@/app/socket.client';
import { fetchProjectReactions, reactProject } from '../comments.service.js';

export function useProjectReactions(projectId) {
  const [reactions, setReactions] = useState([]);
  const [myReaction, setMyReaction] = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
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
    const socket = getSocket();
    if (!socket) return;

    const onReactionUpdate = ({ targetType, targetId, reactions: updated }) => {
      if (targetType === 'project' && targetId === projectId) {
        setReactions(updated);
      }
    };

    socket.on('reaction:update', onReactionUpdate);
    return () => socket.off('reaction:update', onReactionUpdate);
  }, [projectId]);

  const react = useCallback(async (emoji) => {
    const prevReactions = reactions;
    const prevMyReaction = myReaction;

    const isToggleOff = myReaction === emoji;
    setMyReaction(isToggleOff ? null : emoji);
    setReactions(prev => {
      if (isToggleOff) {
        return prev
          .map(r => r.emoji === emoji ? { ...r, count: r.count - 1 } : r)
          .filter(r => r.count > 0);
      }
      const existing = prev.find(r => r.emoji === emoji);
      const removed = myReaction
        ? prev
            .map(r => r.emoji === myReaction ? { ...r, count: r.count - 1 } : r)
            .filter(r => r.count > 0)
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
