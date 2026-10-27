import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { LogoLoader } from '@ui/LogoLoader';
import { cn } from '@/shared/utils/utils';
import { connectSocket } from '@/app/socket.client';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { profilePath } from '../profile-path';
import {
  addWallComment, deleteWallComment, editWallComment, getWall, getWallComment, getWallReplies, orderSiblings,
  setWallCommentLike, setWallCommentPin, setWallSubscription, wallErrorKey, WALL_PAGE_SIZE,
} from './wall.service';
import type { Wall, WallComment } from './wall.service';
import { WallThreadContext, ancestorsOf, findComment, mapComment, withReply, withoutComment } from './wall-thread';
import type { ThreadPath, WallThread } from './wall-thread';
import WallComposer from './WallComposer';
import CommentNode from './CommentNode';

// A linked comment (#comment-<id>, from a notification) flashes: tinted, then fading out.
const FLASH_HOLD_MS = 1200;
const FLASH_FADE_MS = 1000;
const COMMENT_HASH = /^#comment-([a-f0-9]{24})$/;

type WallEvent =
  | { type: 'comment'; commentId: string; parentId: string | null }
  | { type: 'edit'; commentId: string }
  | { type: 'delete'; commentId: string }
  | { type: 'like'; commentId: string; likeCount: number }
  | { type: 'pin'; commentId: string | null };

/** The comments other people leave on a profile, at the bottom of the page. */
export default function WallSection({ accountName, isOwner }: { accountName: string; isOwner: boolean }) {
  const { t } = useTranslation();
  const tk = t as (key: string, opts?: object) => string;
  const { user } = useAuthContext();
  const signedIn = !!user;
  const viewerId = (user?.id ?? user?._id) as string | undefined;
  const location = useLocation();

  const [wall, setWall] = useState<Wall | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingRepliesFor, setLoadingRepliesFor] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ highlightedId: string; path: ThreadPath } | null>(null);
  const [hoverPath, setHoverPath] = useState<ThreadPath | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [flash, setFlash] = useState<{ id: string; fading: boolean } | null>(null);
  // New top-level comments that arrived while the viewer was on a later page.
  const [newOnFirstPage, setNewOnFirstPage] = useState(0);
  // Announced to screen readers when the wall changes live.
  const [liveMessage, setLiveMessage] = useState('');
  const handledLink = useRef<string | null>(null);
  // The live handler reads the latest wall without re-subscribing on every change.
  const wallRef = useRef<Wall | null>(null);
  useEffect(() => { wallRef.current = wall; }, [wall]);

  const report = useCallback((err: unknown) => toast.error(tk(wallErrorKey(err))), [tk]);

  const load = useCallback(async (opts: { page?: number; focus?: string | null } = {}) => {
    setFailed(false);
    try {
      setWall(await getWall(accountName, opts));
    } catch {
      setFailed(true);
    }
  }, [accountName]);

  useEffect(() => {
    const focus = COMMENT_HASH.exec(window.location.hash)?.[1] ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWall(null);
    void load({ focus });
  }, [load]);

  const goToPage = async (page: number) => {
    setLoadingPage(true);
    try {
      setWall(await getWall(accountName, { page }));
      if (page === 0) setNewOnFirstPage(0);
      document.getElementById('wall')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      report(err);
    }
    setLoadingPage(false);
  };

  // #comment-<id> (a notification's link): fetch the page holding it if it isn't loaded, then
  // open the way to it, bring it into view and flash it. Once per navigation.
  useEffect(() => {
    const id = COMMENT_HASH.exec(location.hash)?.[1];
    const linkKey = `${location.key}${location.hash}`;
    if (!wall || !id || handledLink.current === linkKey) return;
    const above = ancestorsOf(wall.comments, id);
    if (!above) {
      handledLink.current = linkKey;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void load({ focus: id }).then(() => { handledLink.current = null; });
      return;
    }
    handledLink.current = linkKey;
    setCollapsed(prev => { const next = new Set(prev); above.forEach(a => next.delete(a)); return next; });
    setFlash({ id, fading: false });
    // Two frames: the first renders the revealed replies, the second can find the row.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getElementById(`comment-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
  }, [wall, location.hash, location.key, load]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(
      () => (flash.fading ? setFlash(null) : setFlash({ id: flash.id, fading: true })),
      flash.fading ? FLASH_FADE_MS : FLASH_HOLD_MS,
    );
    return () => clearTimeout(timer);
  }, [flash]);

  // Live: watch this wall's room. Each event says what changed; the comment itself is fetched
  // as this viewer may see it (blocks, private projects), never taken from the broadcast.
  useEffect(() => {
    const socket = connectSocket();
    const watch = () => socket.emit('wall:watch', accountName);
    watch();

    const onEvent = async (event: WallEvent) => {
      const current = wallRef.current;
      if (!current) return;
      if (event.type === 'like') {
        setWall(prev => prev && { ...prev, comments: mapComment(prev.comments, event.commentId, c => ({ ...c, likeCount: event.likeCount })) });
        return;
      }
      if (event.type === 'delete') {
        setWall(prev => {
          if (!prev || !findComment(prev.comments, event.commentId)) return prev;
          const top = prev.comments.some(c => c.id === event.commentId);
          const { comments, removed } = withoutComment(prev.comments, event.commentId);
          return { ...prev, comments, totalAll: prev.totalAll - removed, total: top ? prev.total - 1 : prev.total };
        });
        return;
      }
      if (event.type === 'pin') {
        if (current.page === 0) void load({ page: 0 });
        return;
      }
      if (event.type === 'edit') {
        if (!findComment(current.comments, event.commentId)) return;
        const fresh = await getWallComment(event.commentId).catch(() => null);
        if (fresh) setWall(prev => prev && { ...prev, comments: mapComment(prev.comments, fresh.id, c => ({ ...fresh, replies: c.replies })) });
        return;
      }
      // A new comment: skip our own (already added) and anything we can't place.
      if (findComment(current.comments, event.commentId)) return;
      if (event.parentId === null && current.page !== 0) {
        setNewOnFirstPage(n => n + 1);
        return;
      }
      if (event.parentId && !findComment(current.comments, event.parentId)) return;
      const fresh = await getWallComment(event.commentId).catch(() => null);
      if (!fresh) return;
      setWall(prev => {
        if (!prev || findComment(prev.comments, fresh.id)) return prev;
        if (fresh.depth === 0) {
          // After the pinned comment, which stays first.
          const pinned = prev.comments.filter(c => c.pinned);
          const rest = prev.comments.filter(c => !c.pinned);
          return { ...prev, comments: [...pinned, fresh, ...rest], total: prev.total + 1, totalAll: prev.totalAll + 1 };
        }
        return { ...prev, comments: withReply(prev.comments, event.parentId!, fresh, orderSiblings), totalAll: prev.totalAll + 1 };
      });
      setLiveMessage(t('profile.wall.liveNewComment', { name: fresh.author.displayName || fresh.author.accountName }));
    };

    socket.on('wall:event', onEvent);
    socket.on('connect', watch); // a reconnect starts outside every room
    return () => {
      socket.off('wall:event', onEvent);
      socket.off('connect', watch);
      socket.emit('wall:unwatch');
    };
  }, [accountName, load, t]);

  const reveal = (id: string) => setCollapsed(prev => { const next = new Set(prev); next.delete(id); return next; });

  const post = async (body: string): Promise<boolean> => {
    setBusy(true);
    try {
      const created = await addWallComment(accountName, body, null);
      if (wall && wall.page !== 0) {
        // A new comment is the newest, so it lives on the first page.
        await goToPage(0);
      } else {
        setWall(prev => {
          if (!prev || findComment(prev.comments, created.id)) return prev;
          const pinned = prev.comments.filter(c => c.pinned);
          const rest = prev.comments.filter(c => !c.pinned);
          return { ...prev, comments: [...pinned, created, ...rest], total: prev.total + 1, totalAll: prev.totalAll + 1, subscribed: isOwner ? prev.subscribed : true };
        });
      }
      return true;
    } catch (err) {
      report(err);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const reply = async (answered: WallComment, insertUnder: string, body: string): Promise<boolean> => {
    setBusy(true);
    try {
      const created = await addWallComment(accountName, body, answered.id);
      setWall(prev => !prev ? prev : {
        ...prev,
        comments: withReply(prev.comments, insertUnder, created, orderSiblings),
        totalAll: findComment(prev.comments, created.id) ? prev.totalAll : prev.totalAll + 1,
        // Commenting subscribes you to the wall.
        subscribed: isOwner ? prev.subscribed : true,
      });
      reveal(insertUnder);
      setReplyingTo(null);
      return true;
    } catch (err) {
      report(err);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const edit = async (comment: WallComment, body: string): Promise<boolean> => {
    setBusy(true);
    try {
      const fresh = await editWallComment(comment.id, body);
      setWall(prev => prev && { ...prev, comments: mapComment(prev.comments, comment.id, c => ({ ...fresh, replies: c.replies, replyCount: c.replyCount, descendantCount: c.descendantCount })) });
      setEditingId(null);
      return true;
    } catch (err) {
      report(err);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteWallComment(id);
      setWall(prev => {
        if (!prev) return prev;
        const top = prev.comments.some(c => c.id === id);
        const { comments, removed } = withoutComment(prev.comments, id);
        return { ...prev, comments, totalAll: prev.totalAll - removed, total: top ? prev.total - 1 : prev.total };
      });
    } catch (err) {
      report(err);
    }
  };

  const toggleLike = async (comment: WallComment) => {
    const liked = !comment.likedByMe;
    const apply = (likedByMe: boolean, likeCount: number) =>
      setWall(prev => prev ? { ...prev, comments: mapComment(prev.comments, comment.id, c => ({ ...c, likedByMe, likeCount })) } : prev);
    apply(liked, comment.likeCount + (liked ? 1 : -1));
    try {
      const result = await setWallCommentLike(comment.id, liked);
      apply(result.liked, result.likeCount);
    } catch (err) {
      apply(comment.likedByMe, comment.likeCount);
      report(err);
    }
  };

  const togglePin = async (comment: WallComment) => {
    try {
      await setWallCommentPin(comment.id, !comment.pinned);
      toast.success(t(comment.pinned ? 'profile.wall.unpinned' : 'profile.wall.pinnedToast'));
      await goToPage(0);
    } catch (err) {
      report(err);
    }
  };

  const loadMoreReplies = async (comment: WallComment) => {
    setLoadingRepliesFor(comment.id);
    try {
      const more = await getWallReplies(comment.id, comment.replies.length);
      setWall(prev => prev && {
        ...prev,
        comments: mapComment(prev.comments, comment.id, c => {
          const have = new Set(c.replies.map(r => r.id));
          return { ...c, replies: [...c.replies, ...more.filter(r => !have.has(r.id))] };
        }),
      });
    } catch (err) {
      report(err);
    }
    setLoadingRepliesFor(null);
  };

  const select = (comment: WallComment, parentId: string | null) => {
    const next = parentId
      ? { highlightedId: parentId, path: { parent: parentId, child: comment.id } }
      : { highlightedId: comment.id, path: { parent: comment.id, child: null } };
    setSelection(prev => (prev && prev.highlightedId === next.highlightedId && prev.path.child === next.path.child ? null : next));
  };

  const toggleSubscription = async () => {
    if (!wall) return;
    const next = !wall.subscribed;
    setWall({ ...wall, subscribed: next });
    try {
      await setWallSubscription(accountName, next);
      toast.success(t(next ? 'profile.wall.subscribed' : 'profile.wall.unsubscribed'));
    } catch (err) {
      setWall(prev => prev ? { ...prev, subscribed: !next } : prev);
      report(err);
    }
  };

  if (failed) {
    return (
      <section className="mt-10 flex items-center gap-3 text-sm text-zinc-500">
        <p>{t('profile.wall.loadError')}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>{t('profile.wall.retry')}</Button>
      </section>
    );
  }
  if (!wall) return null;
  if (!wall.enabled) {
    // Everyone else sees nothing; the owner is told why their wall is missing.
    return isOwner ? (
      <section className="mt-10 rounded-xl border border-dashed border-zinc-800 p-4 text-sm text-zinc-500">
        {t('profile.wall.disabledOwner')} <Link to="/settings/privacy" className="text-primary hover:underline">{t('profile.wall.privacySettings')}</Link>
      </section>
    ) : null;
  }

  const pageCount = Math.max(1, Math.ceil(wall.total / WALL_PAGE_SIZE));

  const thread: WallThread = {
    signedIn,
    viewerId,
    isOwner,
    busy,
    replyingTo,
    setReplyingTo,
    reply,
    editingId,
    setEditingId,
    edit,
    remove,
    toggleLike,
    togglePin,
    loadMoreReplies,
    loadingRepliesFor,
    highlightedId: selection?.highlightedId ?? null,
    paths: [hoverPath, selection?.path].filter((p): p is ThreadPath => !!p),
    setHoverPath,
    select,
    collapsed,
    toggleCollapsed: (id) => setCollapsed(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }),
    flash,
  };

  return (
    <section id="wall" aria-labelledby="wall-title" className="mt-10 flex scroll-mt-20 flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="wall-title" className="text-lg font-bold text-zinc-100">
          {t('profile.wall.title')} <span className="ml-1 font-mono text-sm font-medium text-zinc-500">{wall.totalAll}</span>
        </h2>
        {signedIn && !isOwner && (
          <Tip content={t(wall.subscribed ? 'profile.wall.unsubscribe' : 'profile.wall.subscribe')}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={wall.subscribed}
              onClick={toggleSubscription}
              className={wall.subscribed ? 'border-primary/40 text-primary' : ''}
            >
              <Icon name="notifications" size={14} />
              {t(wall.subscribed ? 'profile.wall.following' : 'profile.wall.follow')}
            </Button>
          </Tip>
        )}
      </div>

      {signedIn ? (
        <WallComposer
          placeholder={t(isOwner ? 'profile.wall.placeholderOwn' : 'profile.wall.placeholder')}
          submitLabel={t('profile.wall.post')}
          busy={busy && replyingTo === null && editingId === null}
          onSubmit={post}
        />
      ) : (
        <p className="text-sm text-zinc-500">
          <Link to={`/auth/signin?redirect=${encodeURIComponent(profilePath(accountName))}`} className="text-primary hover:underline">{t('profile.wall.signIn')}</Link>
          {' '}{t('profile.wall.signInToComment')}
        </p>
      )}

      {newOnFirstPage > 0 && (
        <button
          type="button"
          onClick={() => void goToPage(0)}
          className="flex w-fit items-center gap-1.5 self-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <Icon name="arrow_upward" size={14} />
          {t('profile.wall.newComments', { count: newOnFirstPage })}
        </button>
      )}

      <div className={cn('rounded-xl border border-zinc-800/80 bg-zinc-950/30 p-4 transition-opacity', loadingPage && 'opacity-60')}>
        {wall.comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">{t('profile.wall.empty')}</p>
        ) : (
          <WallThreadContext value={thread}>
            <ul className="flex flex-col gap-6">
              {wall.comments.map(c => <CommentNode key={c.id} comment={c} />)}
            </ul>
          </WallThreadContext>
        )}
      </div>

      <p className="sr-only" aria-live="polite">{liveMessage}</p>

      {pageCount > 1 && (
        <nav aria-label={t('profile.wall.title')} className="flex items-center justify-end gap-2 text-sm">
          {loadingPage && <LogoLoader size={12} />}
          <span className="text-xs text-zinc-500">{t('profile.wall.pageOf', { page: wall.page + 1, pages: pageCount })}</span>
          <Button type="button" variant="outline" size="sm" disabled={wall.page === 0 || loadingPage} onClick={() => void goToPage(wall.page - 1)}>
            {t('common.pagination.previous')}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!wall.hasMore || loadingPage} onClick={() => void goToPage(wall.page + 1)}>
            {t('common.pagination.next')}
          </Button>
        </nav>
      )}
    </section>
  );
}
