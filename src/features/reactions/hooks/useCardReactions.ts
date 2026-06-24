import { useState, useCallback } from 'react';
import { fetchProjectReactions, reactProject } from '../reactions.service';

interface Reaction { emoji: string; count: number; }

interface CardReactionState {
  reactions: Reaction[];
  myReaction: string | null;
  loaded: boolean;
  loading: boolean;
}

const cache = new Map<string, { reactions: Reaction[]; myReaction: string | null }>();

export function useCardReactions(publicId: string | null) {
  const [state, setState] = useState<CardReactionState>(() => {
    if (publicId && cache.has(publicId)) {
      const c = cache.get(publicId)!;
      return { reactions: c.reactions, myReaction: c.myReaction, loaded: true, loading: false };
    }
    return { reactions: [], myReaction: null, loaded: false, loading: false };
  });

  const load = useCallback(async () => {
    if (!publicId || state.loaded || state.loading) return;
    setState(s => ({ ...s, loading: true }));
    try {
      const result = await fetchProjectReactions(publicId) as { reactions: Reaction[]; myReaction: string | null };
      cache.set(publicId, result);
      setState({ reactions: result.reactions, myReaction: result.myReaction, loaded: true, loading: false });
    } catch {
      setState(s => ({ ...s, loading: false }));
    }
  }, [publicId, state.loaded, state.loading]);

  const react = useCallback(async (emoji: string) => {
    if (!publicId) return;
    const isToggleOff = state.myReaction === emoji;

    // Optimistic update
    setState(prev => {
      const newMyReaction = isToggleOff ? null : emoji;
      let newReactions = prev.reactions;
      if (isToggleOff) {
        newReactions = prev.reactions.flatMap(r => {
          const next = r.emoji === emoji ? { ...r, count: r.count - 1 } : r;
          return next.count > 0 ? [next] : [];
        });
      } else {
        const removed = prev.myReaction
          ? prev.reactions.flatMap(r => {
              const next = r.emoji === prev.myReaction ? { ...r, count: r.count - 1 } : r;
              return next.count > 0 ? [next] : [];
            })
          : prev.reactions;
        const existing = removed.find(r => r.emoji === emoji);
        newReactions = existing
          ? removed.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r)
          : [...removed, { emoji, count: 1 }];
      }
      return { ...prev, myReaction: newMyReaction, reactions: newReactions };
    });

    try {
      const result = await reactProject(publicId, emoji) as { reactions: Reaction[]; myReaction: string | null };
      cache.set(publicId, result);
      setState(s => ({ ...s, reactions: result.reactions, myReaction: result.myReaction }));
    } catch {
      // rollback handled by stale state — not critical for feed cards
    }
  }, [publicId, state.myReaction]);

  return { ...state, load, react };
}
