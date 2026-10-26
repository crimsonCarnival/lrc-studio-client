import { useCallback, useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { LogoLoader } from '@ui/LogoLoader';
import { InitialsAvatar } from '@/shared/ui/InitialsAvatar';
import { cn } from '@/shared/utils/utils';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useSettings } from '@/features/settings/useSettings';
import { formatTimeAgo } from '@/features/notifications/time-ago';
import { profilePath } from '../profile-path';
import {
  addWallComment, deleteWallComment, getWall, setWallSubscription, wallErrorCode,
  WALL_MAX_DEPTH,
} from './wall.service';
import type { Wall, WallComment } from './wall.service';
import { userToken } from './wall-tags';
import WallComposer from './WallComposer';
import CommentBody from './CommentBody';

const WALL_ERROR_KEYS = ['rate_limited', 'wall_disabled', 'forbidden', 'invalid_body', 'max_depth', 'not_found', 'tag_not_allowed'] as const;

/** Adds `reply` under the comment `parentId`, wherever it sits in the tree. */
function withReply(comments: WallComment[], parentId: string, reply: WallComment): WallComment[] {
  return comments.map(c => c.id === parentId
    ? { ...c, replies: [...c.replies, reply] }
    : { ...c, replies: withReply(c.replies, parentId, reply) });
}

function withoutComment(comments: WallComment[], id: string): WallComment[] {
  return comments.filter(c => c.id !== id).map(c => ({ ...c, replies: withoutComment(c.replies, id) }));
}

const countAll = (c: WallComment): number => 1 + c.replies.reduce((n, r) => n + countAll(r), 0);

interface NodeProps {
  comment: WallComment;
  signedIn: boolean;
  replyingTo: string | null;
  busy: boolean;
  onReplyingTo: (id: string | null) => void;
  onReply: (parentId: string, body: string) => Promise<boolean>;
  onDelete: (id: string) => void;
  /** The comment whose thread this one hangs from; null at the top level. */
  threadOf?: string | null;
  /** Last reply in its thread: the thread line ends in this reply's curve. */
  isLast?: boolean;
  highlightedId: string | null;
  onHighlight: (id: string) => void;
  hoveredThread: string | null;
  onHoverThread: (id: string | null) => void;
}

// Thread geometry, in px from a comment's left edge. The avatar is 32px wide, so its
// centre (where a thread line hangs) is at 16; a reply sits 32px further in. A reply's row
// starts 12px down (pt-3) and pads its avatar 8px (py-2), so the avatar's centre — where
// the curve lands — is 36px below the reply's top (h-9).
const lineColor = (active: boolean) => (active ? 'border-primary/70' : 'border-zinc-700');
const lineFill = (active: boolean) => (active ? 'bg-primary/70' : 'bg-zinc-700');

// Shared by the comment actions: a press shrinks the button slightly.
const ACTION_BUTTON = 'rounded-full transition-[color,background-color,transform] active:scale-90';

function CommentNode({
  comment, signedIn, replyingTo, busy, onReplyingTo, onReply, onDelete,
  threadOf = null, isLast = false, highlightedId, onHighlight, hoveredThread, onHoverThread,
}: NodeProps) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const { user } = useAuthContext();
  const viewerId = (user?.id ?? user?._id) as string | undefined;
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { author } = comment;
  const name = author.displayName || author.accountName;
  const open = replyingTo === comment.id;
  const hasReplies = comment.replies.length > 0;
  const highlighted = highlightedId === comment.id;
  // A thread lights up while its line is hovered or its comment is highlighted.
  const ownThreadActive = hoveredThread === comment.id || highlighted;
  const parentThreadActive = threadOf !== null && (hoveredThread === threadOf || highlightedId === threadOf);

  const handleRowClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('a, button, textarea, input')) return;
    if (window.getSelection()?.toString()) return; // finishing a text selection is not a click
    onHighlight(comment.id);
  };

  return (
    <li id={`comment-${comment.id}`} className={cn('relative flex flex-col gap-2', threadOf && 'pt-3')}>
      {threadOf && (
        <>
          {/* The parent's line curving into this reply's avatar… */}
          <span aria-hidden className={cn('pointer-events-none absolute -left-[17px] top-0 h-9 w-3.5 rounded-bl-xl border-b-2 border-l-2 transition-colors', lineColor(parentThreadActive))} />
          {/* …and, where more replies follow, picking up again below the curve: a short gap,
              then a fade back in, so each branch reads as splitting off the thread. */}
          {!isLast && (
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute -left-[17px] top-11 bottom-0 w-0.5 transition-colors [mask-image:linear-gradient(to_bottom,transparent,black_14px)]',
                lineFill(parentThreadActive),
              )}
            />
          )}
          {/* A wider target than the 2px line, for hovering and clicking it. */}
          <span
            aria-hidden
            onMouseEnter={() => onHoverThread(threadOf)}
            onMouseLeave={() => onHoverThread(null)}
            onClick={() => onHighlight(threadOf)}
            className={cn('absolute -left-6 top-0 w-4 cursor-pointer', isLast ? 'h-9' : 'bottom-0')}
          />
        </>
      )}
      <div
        onClick={handleRowClick}
        className={cn(
          // -mx-3 px-3 keeps the avatar where the thread lines expect it while the row's
          // own background and ring get room around the content.
          'relative -mx-3 flex cursor-pointer gap-3 rounded-xl px-3 py-2 transition-colors',
          highlighted
            ? 'bg-primary/[0.08] ring-1 ring-inset ring-primary/35 shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-primary)_6%,transparent)]'
            : 'hover:bg-zinc-800/40',
        )}
      >
        {hasReplies && (
          <>
            {/* This comment's own line, from under its avatar down to its replies. */}
            <span aria-hidden className={cn('pointer-events-none absolute left-[27px] top-11 -bottom-2 border-l-2 transition-colors', lineColor(ownThreadActive))} />
            <span
              aria-hidden
              onMouseEnter={() => onHoverThread(comment.id)}
              onMouseLeave={() => onHoverThread(null)}
              className="absolute left-5 top-11 -bottom-2 w-4"
            />
          </>
        )}
        <Link to={profilePath(author.accountName)} className="shrink-0">
          {author.avatarUrl
            ? <img src={author.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-8 rounded-full object-cover" />
            : <InitialsAvatar name={name} handle={author.accountName} className="size-8 rounded-full text-xs" />}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <Link to={profilePath(author.accountName)} className="font-semibold text-zinc-100 hover:text-primary transition-colors">{name}</Link>
            <span className="text-xs text-zinc-500">
              {formatTimeAgo(comment.createdAt, t, settings.advanced?.timezone, i18n.resolvedLanguage || i18n.language)}
            </span>
          </p>
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-300"><CommentBody comment={comment} /></p>
          <div className="mt-1 -ml-1.5 flex items-center gap-1 text-xs text-zinc-500">
            {signedIn && comment.depth < WALL_MAX_DEPTH && (
              <Tip content={t('profile.wall.reply')}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t('profile.wall.reply')}
                  aria-pressed={open}
                  onClick={() => onReplyingTo(open ? null : comment.id)}
                  className={cn(ACTION_BUTTON, open ? 'bg-primary/15 text-primary' : 'text-zinc-500 hover:text-primary')}
                >
                  <Icon name="reply" size={15} />
                </Button>
              </Tip>
            )}
            {comment.canDelete && (
              confirmingDelete ? (
                <span className="flex items-center gap-1">
                  <span className="px-1 text-destructive">{t('profile.wall.confirmDelete')}</span>
                  <Tip content={t('profile.wall.deleteConfirm')}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t('profile.wall.deleteConfirm')}
                      onClick={() => onDelete(comment.id)}
                      className={cn(ACTION_BUTTON, 'text-destructive hover:bg-destructive/15 hover:text-destructive')}
                    >
                      <Icon name="check" size={15} />
                    </Button>
                  </Tip>
                  <Tip content={t('common.cancel')}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t('common.cancel')}
                      onClick={() => setConfirmingDelete(false)}
                      className={cn(ACTION_BUTTON, 'text-zinc-500 hover:text-zinc-100')}
                    >
                      <Icon name="close" size={15} />
                    </Button>
                  </Tip>
                </span>
              ) : (
                <Tip content={t('profile.wall.delete')}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t('profile.wall.delete')}
                    onClick={() => setConfirmingDelete(true)}
                    className={cn(ACTION_BUTTON, 'text-zinc-500 hover:bg-destructive/15 hover:text-destructive')}
                  >
                    <Icon name="delete" size={15} />
                  </Button>
                </Tip>
              )
            )}
          </div>
        </div>
      </div>

      {(open || hasReplies) && (
        // Replies sit 32px in. Spacing is padding, not gap, so the thread lines run unbroken.
        <div className="ml-4 flex flex-col pl-4">
          {open && (
            <div className="relative pb-2">
              {hasReplies && <span aria-hidden className={cn('pointer-events-none absolute -left-[17px] top-0 bottom-0 border-l-2 transition-colors', lineColor(ownThreadActive))} />}
              <WallComposer
                autoFocus
                placeholder={t('profile.wall.replyPlaceholder', { name })}
                submitLabel={t('profile.wall.reply')}
                busy={busy}
                onSubmit={body => onReply(comment.id, body)}
                onCancel={() => onReplyingTo(null)}
                // A reply starts by tagging the author it answers, unless that's you or they don't allow tags.
                initialTags={viewerId && author.id !== viewerId && author.allowsTags ? [{ display: `@${author.accountName}`, token: userToken(author.id) }] : undefined}
              />
            </div>
          )}
          {hasReplies && (
            <ul className="flex flex-col">
              {comment.replies.map((r, i) => (
                <CommentNode
                  key={r.id}
                  comment={r}
                  signedIn={signedIn}
                  replyingTo={replyingTo}
                  busy={busy}
                  onReplyingTo={onReplyingTo}
                  onReply={onReply}
                  onDelete={onDelete}
                  threadOf={comment.id}
                  isLast={i === comment.replies.length - 1}
                  highlightedId={highlightedId}
                  onHighlight={onHighlight}
                  hoveredThread={hoveredThread}
                  onHoverThread={onHoverThread}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

/** The comments other people leave on a profile, at the bottom of the page. */
export default function WallSection({ accountName, isOwner }: { accountName: string; isOwner: boolean }) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;
  const { user } = useAuthContext();
  const signedIn = !!user;
  const [wall, setWall] = useState<Wall | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [hoveredThread, setHoveredThread] = useState<string | null>(null);
  const toggleHighlight = (id: string) => setHighlightedId(prev => (prev === id ? null : id));

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setWall(await getWall(accountName));
    } catch {
      setFailed(true);
    }
  }, [accountName]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWall(null);
    void load();
  }, [load]);

  const report = (err: unknown) => {
    const code = wallErrorCode(err);
    toast.error(tk(`profile.wall.errors.${(WALL_ERROR_KEYS as readonly string[]).includes(code) ? code : 'failed'}`));
  };

  const loadMore = async () => {
    const last = wall?.comments[wall.comments.length - 1];
    if (!wall || !last) return;
    setLoadingMore(true);
    try {
      const next = await getWall(accountName, last.createdAt);
      setWall(prev => prev ? { ...prev, comments: [...prev.comments, ...next.comments], hasMore: next.hasMore } : next);
    } catch (err) {
      report(err);
    }
    setLoadingMore(false);
  };

  const post = async (body: string, parentId: string | null): Promise<boolean> => {
    setBusy(true);
    try {
      const created = await addWallComment(accountName, body, parentId);
      setWall(prev => !prev ? prev : {
        ...prev,
        comments: parentId ? withReply(prev.comments, parentId, created) : [created, ...prev.comments],
        total: parentId ? prev.total : prev.total + 1,
        // Commenting subscribes you to the wall.
        subscribed: isOwner ? prev.subscribed : true,
      });
      setReplyingTo(null);
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
        const gone = prev.comments.find(c => c.id === id);
        return { ...prev, comments: withoutComment(prev.comments, id), total: gone ? prev.total - 1 : prev.total };
      });
    } catch (err) {
      report(err);
    }
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

  const shown = wall.comments.reduce((n, c) => n + countAll(c), 0);

  return (
    <section id="wall" aria-labelledby="wall-title" className="mt-10 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="wall-title" className="text-lg font-bold text-zinc-100">
          {t('profile.wall.title')} <span className="ml-1 font-mono text-sm font-medium text-zinc-500">{shown}</span>
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
          busy={busy && replyingTo === null}
          onSubmit={body => post(body, null)}
        />
      ) : (
        <p className="text-sm text-zinc-500">
          <Link to={`/auth/signin?redirect=${encodeURIComponent(profilePath(accountName))}`} className="text-primary hover:underline">{t('profile.wall.signIn')}</Link>
          {' '}{t('profile.wall.signInToComment')}
        </p>
      )}

      {wall.comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">{t('profile.wall.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-6">
          {wall.comments.map(c => (
            <CommentNode
              key={c.id}
              comment={c}
              signedIn={signedIn}
              replyingTo={replyingTo}
              busy={busy}
              onReplyingTo={setReplyingTo}
              onReply={(parentId, body) => post(body, parentId)}
              onDelete={remove}
              highlightedId={highlightedId}
              onHighlight={toggleHighlight}
              hoveredThread={hoveredThread}
              onHoverThread={setHoveredThread}
            />
          ))}
        </ul>
      )}

      {wall.hasMore && (
        <div className="flex justify-center">
          <Button type="button" variant="outline" size="sm" disabled={loadingMore} onClick={loadMore}>
            {loadingMore ? <LogoLoader size={12} /> : t('profile.wall.loadMore')}
          </Button>
        </div>
      )}
    </section>
  );
}
