import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '@/app/socket.client';
import { fetchComments, fetchCommentReplies, submitComment, removeComment } from '../comments.service.js';

export function useComments(projectId) {
  const [comments, setComments] = useState([]);
  const [total, setTotal]       = useState(0);
  const [hasMore, setHasMore]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]       = useState(null);
  const offsetRef = useRef(0);

  const fetchPage = useCallback(async (offset, append, signal) => {
    try {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      const result = await fetchComments(projectId, offset, 20);
      if (signal?.aborted) return;

      const { comments: items, total: t, hasMore: more } = result;
      setComments(prev => append ? [...prev, ...items] : items);
      setTotal(t);
      setHasMore(more);
      offsetRef.current = offset + items.length;
    } catch (err) {
      if (!signal?.aborted) setError(err);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    const signal = { get aborted() { return cancelled; } };
    offsetRef.current = 0;
    setComments([]);
    setTotal(0);
    setHasMore(false);
    setError(null);
    fetchPage(0, false, signal);
    return () => { cancelled = true; };
  }, [fetchPage]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit('join:project', projectId);

    const onCommentNew = (comment) => {
      if (!comment.parentId) {
        setComments(prev => [comment, ...prev]);
        setTotal(prev => prev + 1);
        offsetRef.current += 1;
      } else {
        setComments(prev =>
          prev.map(c => c.id === comment.parentId
            ? { ...c, replyCount: c.replyCount + 1 }
            : c
          )
        );
      }
    };

    const onCommentDeleted = ({ commentId }) => {
      setComments(prev =>
        prev.map(c => c.id === commentId
          ? { ...c, isDeleted: true, text: '' }
          : c
        )
      );
    };

    socket.on('comment:new', onCommentNew);
    socket.on('comment:deleted', onCommentDeleted);

    return () => {
      socket.off('comment:new', onCommentNew);
      socket.off('comment:deleted', onCommentDeleted);
      socket.emit('leave:project', projectId);
    };
  }, [projectId]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    fetchPage(offsetRef.current, true, null);
  }, [hasMore, loadingMore, fetchPage]);

  const postComment = useCallback(async (text, parentId = null) => {
    await submitComment(projectId, text, parentId);
  }, [projectId]);

  const deleteComment = useCallback(async (id) => {
    await removeComment(id);
  }, []);

  return { comments, total, hasMore, loading, loadingMore, error, loadMore, postComment, deleteComment };
}

export function useCommentReplies(commentId) {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded]   = useState(false);

  const load = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const items = await fetchCommentReplies(commentId);
      setReplies(items);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [commentId, loaded]);

  useEffect(() => {
    if (!loaded) return;

    const socket = getSocket();
    if (!socket) return;

    const onCommentNew = (comment) => {
      if (comment.parentId === commentId) {
        setReplies(prev => [...prev, comment]);
      }
    };

    socket.on('comment:new', onCommentNew);
    return () => socket.off('comment:new', onCommentNew);
  }, [commentId, loaded]);

  return { replies, loading, loaded, load };
}

