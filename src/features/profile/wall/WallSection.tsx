import { createContext, use, useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  addWallComment, deleteWallComment, getWall, orderSiblings, setWallCommentLike, setWallSubscription, wallErrorCode,
  WALL_MAX_DEPTH,
} from './wall.service';
import type { Wall, WallComment } from './wall.service';
import { userToken } from './wall-tags';
import WallComposer from './WallComposer';
import CommentBody from './CommentBody';

const WALL_ERROR_KEYS = ['rate_limited', 'wall_disabled', 'forbidden', 'invalid_body', 'max_depth', 'not_found', 'tag_not_allowed'] as const;

// Top-level comments per page; the server's default page size.
const PAGE_SIZE = 20;
// Replies shown under a comment before "Show N more replies".
const REPLIES_PREVIEW = 3;

/** Applies `fn` to the comment `id`, wherever it sits in the tree. */
function mapComment(comments: WallComment[], id: string, fn: (c: WallComment) => WallComment): WallComment[] {
  return comments.map(c => c.id === id ? fn(c) : { ...c, replies: mapComment(c.replies, id, fn) });
}

function withoutComment(comments: WallComment[], id: string): WallComment[] {
  return comments.filter(c => c.id !== id).map(c => ({ ...c, replies: withoutComment(c.replies, id) }));
}

const countAll = (c: WallComment): number => 1 + c.replies.reduce((n, r) => n + countAll(r), 0);

/** The ids of the comments above `id` (outermost first), or null when it isn't on this page. */
function ancestorsOf(comments: WallComment[], id: string, above: string[] = []): string[] | null {
  for (const c of comments) {
    if (c.id === id) return above;
    const found = ancestorsOf(c.replies, id, [...above, c.id]);
    if (found) return found;
  }
  return null;
}

// A linked comment (#comment-<id>, from a notification) flashes: tinted, then fading out.
const FLASH_HOLD_MS = 1200;
const FLASH_FADE_MS = 1000;

/**
 * A lit stretch of thread line: from `parent`'s avatar down to its reply `child` (or just
 * `parent`'s own line when `child` is null). Only that stretch lights up — later replies of
 * the same parent stay dim.
 */
interface ThreadPath {
  parent: string;
  child: string | null;
}

interface WallThread {
  signedIn: boolean;
  viewerId: string | undefined;
  busy: boolean;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  /** Posts a reply to `answered`; it is listed under `insertUnder` (its parent, at the deepest level). */
  reply: (answered: WallComment, insertUnder: string, body: string) => Promise<boolean>;
  remove: (id: string) => void;
  toggleLike: (comment: WallComment) => void;
  highlightedId: string | null;
  /** The hovered path and the clicked one. */
  paths: ThreadPath[];
  setHoverPath: (path: ThreadPath | null) => void;
  /** Clicking a reply highlights its parent and the line down to it; a top-level comment highlights itself. */
  select: (comment: WallComment, parentId: string | null) => void;
  collapsed: Set<string>;
  toggleCollapsed: (id: string) => void;
  showingAll: Set<string>;
  showAll: (id: string) => void;
  /** The comment opened from a link, while it flashes. */
  flash: { id: string; fading: boolean } | null;
}

const WallThreadContext = createContext<WallThread | null>(null);
const useWallThread = () => use(WallThreadContext)!;

// Thread geometry, in px from a comment's left edge. The avatar is 32px wide, so its
// centre (where a thread line hangs) is at 16; a reply sits 32px further in. A reply's row
// starts 12px down (pt-3) and pads its avatar 8px (py-2), so the avatar's centre — where
// the curve lands — is 36px below the reply's top (h-9).
const lineColor = (active: boolean) => (active ? 'border-primary/70' : 'border-zinc-700');
const lineFill = (active: boolean) => (active ? 'bg-primary/70' : 'bg-zinc-700');

// Shared by the comment actions: a press shrinks the button slightly.
const ACTION_BUTTON = 'rounded-full transition-[color,background-color,transform] active:scale-90';

interface NodeProps {
  comment: WallComment;
  /** The comment whose thread this one hangs from; null at the top level. */
  parentId?: string | null;
  /** The ids of the replies shown beside this one, in order, and this one's position. */
  siblingIds?: string[];
  index?: number;
  /** Last reply shown in its thread: the thread line ends in this reply's curve. */
  isLast?: boolean;
}

function CommentNode({ comment, parentId = null, siblingIds = [], index = 0, isLast = false }: NodeProps) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const w = useWallThread();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { author } = comment;
  const name = author.displayName || author.accountName;
  const atMaxDepth = comment.depth >= WALL_MAX_DEPTH;
  const answeringThis = w.replyingTo === comment.id;

  const collapsed = w.collapsed.has(comment.id);
  const visibleReplies = collapsed ? [] : w.showingAll.has(comment.id) ? comment.replies : comment.replies.slice(0, REPLIES_PREVIEW);
  const hiddenReplies = collapsed ? 0 : comment.replies.length - visibleReplies.length;
  const hasVisibleReplies = visibleReplies.length > 0;
  const visibleIds = visibleReplies.map(r => r.id);

  // Which stretches of line are lit: this comment's own line (a path into its replies), the
  // curve into it (a path ending here), and the line running past it to a later sibling.
  const ownLineActive = w.paths.some(p => p.parent === comment.id);
  const fromParent = parentId ? w.paths.filter(p => p.parent === parentId) : [];
  const curveActive = fromParent.some(p => p.child === comment.id);
  const passActive = fromParent.some(p => p.child !== null && siblingIds.indexOf(p.child) > index);
  const highlighted = w.highlightedId === comment.id;
  const flash = w.flash?.id === comment.id ? w.flash : null;
  const pathHere = parentId ? { parent: parentId, child: comment.id } : null;

  const handleRowClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('a, button, textarea, input')) return;
    if (window.getSelection()?.toString()) return; // finishing a text selection is not a click
    w.select(comment, parentId);
  };

  // A reply starts by tagging the author it answers, unless that's you or they don't allow tags.
  const initialTags = w.viewerId && author.id !== w.viewerId && author.allowsTags
    ? [{ display: `@${author.accountName}`, token: userToken(author.id) }]
    : undefined;
  const composer = (
    <WallComposer
      autoFocus
      placeholder={t('profile.wall.replyPlaceholder', { name })}
      submitLabel={t('profile.wall.reply')}
      busy={w.busy}
      onSubmit={body => w.reply(comment, atMaxDepth && parentId ? parentId : comment.id, body)}
      onCancel={() => w.setReplyingTo(null)}
      initialTags={initialTags}
    />
  );

  return (
    <li id={`comment-${comment.id}`} className={cn('relative flex flex-col gap-2', parentId && 'pt-3')}>
      {parentId && (
        <>
          {/* The parent's line curving into this reply's avatar… */}
          <span aria-hidden className={cn('pointer-events-none absolute -left-[17px] top-0 h-9 w-3.5 rounded-bl-xl border-b-2 border-l-2 transition-colors', lineColor(curveActive))} />
          {/* A path to a later reply runs straight past this one: light that stretch, not the curve. */}
          {passActive && <span aria-hidden className={cn('pointer-events-none absolute -left-[17px] top-0 h-9 w-0.5', lineFill(true))} />}
          {/* …and, where more replies follow, picking up again below the curve: a short gap,
              then a fade back in, so each branch reads as splitting off the thread. */}
          {!isLast && (
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute -left-[17px] top-11 bottom-0 w-0.5 transition-colors [mask-image:linear-gradient(to_bottom,transparent,black_14px)]',
                lineFill(passActive),
              )}
            />
          )}
          {/* A wider target than the 2px line, for hovering and clicking it. */}
          <span
            aria-hidden
            onMouseEnter={() => w.setHoverPath(pathHere)}
            onMouseLeave={() => w.setHoverPath(null)}
            onClick={() => w.select(comment, parentId)}
            className="absolute -left-6 top-0 h-9 w-4 cursor-pointer"
          />
        </>
      )}
      <div
        onClick={handleRowClick}
        onMouseEnter={() => w.setHoverPath(pathHere)}
        onMouseLeave={() => w.setHoverPath(null)}
        className={cn(
          // -mx-3 px-3 keeps the avatar where the thread lines expect it while the row's
          // own background and ring get room around the content; pr-12 clears the delete corner.
          'group/row relative -mx-3 flex cursor-pointer gap-3 rounded-xl py-2 pl-3 pr-12 transition-colors',
          highlighted
            ? 'bg-primary/[0.08] ring-1 ring-inset ring-primary/35 shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-primary)_6%,transparent)]'
            : 'hover:bg-zinc-800/40',
          // Opened from a link: tinted, then a slow fade back (the long duration only while fading).
          flash && !flash.fading && !highlighted && 'bg-primary/15',
          flash?.fading && 'duration-1000',
        )}
      >
        {hasVisibleReplies && (
          <>
            {/* This comment's own line, from under its avatar down to its replies. */}
            <span aria-hidden className={cn('pointer-events-none absolute left-[27px] top-11 -bottom-2 border-l-2 transition-colors', lineColor(ownLineActive))} />
            <span
              aria-hidden
              onMouseEnter={() => w.setHoverPath({ parent: comment.id, child: null })}
              onMouseLeave={() => w.setHoverPath(pathHere)}
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
            <Tip content={!w.signedIn ? t('profile.wall.signInToLike') : t(comment.likedByMe ? 'profile.wall.unlike' : 'profile.wall.like')}>
              <Button
                type="button"
                variant="ghost"
                size={comment.likeCount > 0 ? 'xs' : 'icon-xs'}
                aria-label={t(comment.likedByMe ? 'profile.wall.unlike' : 'profile.wall.like')}
                aria-pressed={comment.likedByMe}
                disabled={!w.signedIn}
                onClick={() => w.toggleLike(comment)}
                className={cn(ACTION_BUTTON, comment.likedByMe ? 'text-rose-400 hover:text-rose-300' : 'text-zinc-500 hover:text-rose-400')}
              >
                <Icon name="favorite" size={15} filled={comment.likedByMe} />
                {comment.likeCount > 0 && <span className="tabular-nums">{comment.likeCount}</span>}
              </Button>
            </Tip>
            {w.signedIn && (
              <Tip content={t('profile.wall.reply')}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t('profile.wall.reply')}
                  aria-pressed={answeringThis}
                  onClick={() => w.setReplyingTo(answeringThis ? null : comment.id)}
                  className={cn(ACTION_BUTTON, answeringThis ? 'bg-primary/15 text-primary' : 'text-zinc-500 hover:text-primary')}
                >
                  <Icon name="reply" size={15} />
                </Button>
              </Tip>
            )}
            {comment.replies.length > 0 && !collapsed && (
              <Tip content={t('profile.wall.hideReplies')}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t('profile.wall.hideReplies')}
                  aria-expanded
                  onClick={() => w.toggleCollapsed(comment.id)}
                  className={cn(ACTION_BUTTON, 'text-zinc-500 hover:text-zinc-100')}
                >
                  <Icon name="expand_less" size={15} />
                </Button>
              </Tip>
            )}
          </div>
        </div>
        {comment.canDelete && (
          // The delete corner: confirming swaps the bin for "Delete it? ✓ ✕".
          <div className="absolute right-2 top-2 flex items-center gap-1 text-xs">
            {confirmingDelete ? (
              <>
                <span className="px-1 text-destructive">{t('profile.wall.confirmDelete')}</span>
                <Tip content={t('profile.wall.deleteConfirm')}>
                  <Button type="button" variant="ghost" size="icon-xs" aria-label={t('profile.wall.deleteConfirm')} onClick={() => w.remove(comment.id)} className={cn(ACTION_BUTTON, 'text-destructive hover:bg-destructive/15 hover:text-destructive')}>
                    <Icon name="check" size={15} />
                  </Button>
                </Tip>
                <Tip content={t('common.cancel')}>
                  <Button type="button" variant="ghost" size="icon-xs" aria-label={t('common.cancel')} onClick={() => setConfirmingDelete(false)} className={cn(ACTION_BUTTON, 'text-zinc-500 hover:text-zinc-100')}>
                    <Icon name="close" size={15} />
                  </Button>
                </Tip>
              </>
            ) : (
              <Tip content={t('profile.wall.delete')}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t('profile.wall.delete')}
                  onClick={() => setConfirmingDelete(true)}
                  // Quiet until the row is hovered or focused, so it doesn't compete with the text.
                  className={cn(ACTION_BUTTON, 'text-zinc-600 opacity-60 group-hover/row:opacity-100 focus-visible:opacity-100 hover:bg-destructive/15 hover:text-destructive')}
                >
                  <Icon name="delete" size={15} />
                </Button>
              </Tip>
            )}
          </div>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={() => w.toggleCollapsed(comment.id)}
          aria-expanded={false}
          className="ml-11 flex w-fit items-center gap-1 rounded-full border border-zinc-700 px-2.5 py-0.5 text-xs text-zinc-400 transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Icon name="expand_more" size={14} />
          {t('profile.wall.showReplies', { count: countAll(comment) - 1 })}
        </button>
      )}

      {/* At the deepest level a reply sits beside this comment, so its box opens right here. */}
      {answeringThis && atMaxDepth && <div className="pl-11">{composer}</div>}

      {((answeringThis && !atMaxDepth) || hasVisibleReplies || hiddenReplies > 0) && (
        // Replies sit 32px in. Spacing is padding, not gap, so the thread lines run unbroken.
        <div className="ml-4 flex flex-col pl-4">
          {answeringThis && !atMaxDepth && (
            <div className="relative pb-2">
              {hasVisibleReplies && <span aria-hidden className={cn('pointer-events-none absolute -left-[17px] top-0 bottom-0 border-l-2 transition-colors', lineColor(ownLineActive))} />}
              {composer}
            </div>
          )}
          {hasVisibleReplies && (
            <ul className="flex flex-col">
              {visibleReplies.map((r, i) => (
                <CommentNode
                  key={r.id}
                  comment={r}
                  parentId={comment.id}
                  siblingIds={visibleIds}
                  index={i}
                  isLast={i === visibleReplies.length - 1}
                />
              ))}
            </ul>
          )}
          {hiddenReplies > 0 && (
            <button
              type="button"
              onClick={() => w.showAll(comment.id)}
              className="mt-2 ml-11 w-fit text-xs font-medium text-zinc-400 transition-colors hover:text-primary"
            >
              {t('profile.wall.moreReplies', { count: hiddenReplies })}
            </button>
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
  const viewerId = (user?.id ?? user?._id) as string | undefined;
  const [wall, setWall] = useState<Wall | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  // The `after` cursor of every page visited so far; the last one is the current page.
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ highlightedId: string; path: ThreadPath } | null>(null);
  const [hoverPath, setHoverPath] = useState<ThreadPath | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [showingAll, setShowingAll] = useState<Set<string>>(() => new Set());
  const [flash, setFlash] = useState<{ id: string; fading: boolean } | null>(null);
  const location = useLocation();
  const handledLink = useRef<string | null>(null);

  // #comment-<id> (a notification's link): open the way to that comment, bring it into view
  // and flash it. Once per navigation, so liking or replying afterwards doesn't re-trigger it.
  useEffect(() => {
    const id = /^#comment-([a-f0-9]{24})$/.exec(location.hash)?.[1];
    const linkKey = `${location.key}${location.hash}`;
    if (!wall || !id || handledLink.current === linkKey) return;
    const above = ancestorsOf(wall.comments, id);
    if (!above) return; // not on this page (an older page, or deleted)
    handledLink.current = linkKey;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(prev => { const next = new Set(prev); above.forEach(a => next.delete(a)); return next; });
    setShowingAll(prev => { const next = new Set(prev); above.forEach(a => next.add(a)); return next; });
    setFlash({ id, fading: false });
    // Two frames: the first renders the newly revealed replies, the second can find the row.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getElementById(`comment-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
  }, [wall, location.hash, location.key]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(
      () => (flash.fading ? setFlash(null) : setFlash({ id: flash.id, fading: true })),
      flash.fading ? FLASH_FADE_MS : FLASH_HOLD_MS,
    );
    return () => clearTimeout(timer);
  }, [flash]);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setWall(await getWall(accountName));
      setCursors([null]);
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

  const goToPage = async (nextCursors: (string | null)[]) => {
    setLoadingPage(true);
    try {
      setWall(await getWall(accountName, nextCursors[nextCursors.length - 1]));
      setCursors(nextCursors);
      document.getElementById('wall')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      report(err);
    }
    setLoadingPage(false);
  };

  const reveal = (id: string) => {
    setCollapsed(prev => { const next = new Set(prev); next.delete(id); return next; });
    setShowingAll(prev => new Set(prev).add(id));
  };

  const post = async (body: string): Promise<boolean> => {
    setBusy(true);
    try {
      const created = await addWallComment(accountName, body, null);
      if (cursors.length > 1) {
        // A new comment is the newest, so it lives on the first page.
        await goToPage([null]);
      } else {
        setWall(prev => !prev ? prev : { ...prev, comments: [created, ...prev.comments], total: prev.total + 1, subscribed: isOwner ? prev.subscribed : true });
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
        comments: mapComment(prev.comments, insertUnder, p => ({ ...p, replies: orderSiblings([...p.replies, created]) })),
        // Commenting subscribes you to the wall.
        subscribed: isOwner ? prev.subscribed : true,
      });
      reveal(insertUnder); // the new reply must not land behind "Show N more replies"
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

  const shown = wall.comments.reduce((n, c) => n + countAll(c), 0);
  const page = cursors.length - 1;
  const pageCount = Math.max(1, Math.ceil(wall.total / PAGE_SIZE));
  const last = wall.comments[wall.comments.length - 1];

  const thread: WallThread = {
    signedIn,
    viewerId,
    busy,
    replyingTo,
    setReplyingTo,
    reply,
    remove,
    toggleLike,
    highlightedId: selection?.highlightedId ?? null,
    paths: [hoverPath, selection?.path].filter((p): p is ThreadPath => !!p),
    setHoverPath,
    select,
    collapsed,
    toggleCollapsed: (id) => setCollapsed(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }),
    showingAll,
    showAll: (id) => setShowingAll(prev => new Set(prev).add(id)),
    flash,
  };

  return (
    <section id="wall" aria-labelledby="wall-title" className="mt-10 flex scroll-mt-20 flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-6">
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
          onSubmit={post}
        />
      ) : (
        <p className="text-sm text-zinc-500">
          <Link to={`/auth/signin?redirect=${encodeURIComponent(profilePath(accountName))}`} className="text-primary hover:underline">{t('profile.wall.signIn')}</Link>
          {' '}{t('profile.wall.signInToComment')}
        </p>
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

      {pageCount > 1 && (
        <nav aria-label={t('profile.wall.title')} className="flex items-center justify-end gap-2 text-sm">
          {loadingPage && <LogoLoader size={12} />}
          <span className="text-xs text-zinc-500">{t('profile.wall.pageOf', { page: page + 1, pages: pageCount })}</span>
          <Button type="button" variant="outline" size="sm" disabled={page === 0 || loadingPage} onClick={() => void goToPage(cursors.slice(0, -1))}>
            {t('common.pagination.previous')}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!wall.hasMore || !last || loadingPage} onClick={() => last && void goToPage([...cursors, last.createdAt])}>
            {t('common.pagination.next')}
          </Button>
        </nav>
      )}
    </section>
  );
}
