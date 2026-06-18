import { useState, useEffect, useCallback } from 'react';
import { connectSocket } from '@/app/socket.client';
import { fetchProjectReactions, reactProject } from '../reactions.service.js';

interface Reaction {
  emoji: string;
  count: number;
}

export function useProjectReactions(publicId: string | null) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!publicId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetchProjectReactions(publicId)
      .then((result: { reactions: Reaction[]; myReaction: string | null }) => {
        if (cancelled) return;
        setReactions(result.reactions);
        setMyReaction(result.myReaction);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [publicId]);

  useEffect(() => {
    const socket = connectSocket();

    if (publicId) {
      socket.emit('join:project', publicId);
    }

    const onReactionUpdate = ({ targetType, targetId, reactions: updated }: { targetType: string; targetId: string; reactions: Reaction[] }) => {
      if (targetType === 'project' && targetId === publicId) {
        setReactions(updated);
      }
    };

    socket.on('reaction:update', onReactionUpdate);
    return () => {
      socket.off('reaction:update', onReactionUpdate);
      if (publicId) socket.emit('leave:project', publicId);
    };
  }, [publicId]);

  const react = useCallback(async (emoji: string) => {
    if (!publicId) return;
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
      const result = await reactProject(publicId, emoji) as { reactions: Reaction[]; myReaction: string | null };
      setReactions(result.reactions);
      setMyReaction(result.myReaction);
    } catch {
      setReactions(prevReactions);
      setMyReaction(prevMyReaction);
    }
  }, [publicId, reactions, myReaction]);

  return { reactions, myReaction, loading, react };
}
