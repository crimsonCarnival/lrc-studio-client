import { useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { LogoLoader } from '@ui/LogoLoader';
import { InitialsAvatar } from '@/shared/ui/InitialsAvatar';
import { UserHoverCard } from '@ui/UserHoverCard';
import { cn } from '@/shared/utils/utils';
import { useSettings } from '@/features/settings/useSettings';
import { formatTimeAgo } from '@/features/notifications/time-ago';
import { profilePath } from '../profile-path';
import { WALL_MAX_DEPTH } from './wall.service';
import type { WallComment } from './wall.service';
import { deserializeBody, userToken } from './wall-tags';
import { useWallThread } from './wall-thread';
import WallComposer from './WallComposer';
import CommentBody from './CommentBody';
import { CommentMenu, LikersPopover } from './CommentMenus';

// Thread geometry, in px from a comment's left edge. The avatar is 32px wide, so its
// centre (where a thread line hangs) is at 16; a reply sits 32px further in. A reply's row
// starts 12px down (pt-3) and pads its avatar 8px (py-2), so the avatar's centre — where
// the curve lands — is 36px below the reply's top (h-9).
const lineColor = (active: boolean) => (active ? 'border-primary/70' : 'border-zinc-700');
const lineFill = (active: boolean) => (active ? 'bg-primary/70' : 'bg-zinc-700');

// Shared by the comment actions: a press shrinks the button slightly.
const ACTION_BUTTON = 'rounded-full transition-[color,background-color,transform] active:scale-90';
// Corner actions stay quiet until the row is hovered or focused, so they don't compete with the text.
const CORNER_BUTTON = cn(ACTION_BUTTON, 'text-zinc-600 opacity-60 group-hover/row:opacity-100 focus-visible:opacity-100');

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

export default function CommentNode({ comment, parentId = null, siblingIds = [], index = 0, isLast = false }: NodeProps) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const w = useWallThread();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { author } = comment;
  const name = author.displayName || author.accountName;
  const atMaxDepth = comment.depth >= WALL_MAX_DEPTH;
  const answeringThis = w.replyingTo === comment.id;
  const editingThis = w.editingId === comment.id;
  const language = i18n.resolvedLanguage || i18n.language;

  const collapsed = w.collapsed.has(comment.id);
  const visibleReplies = collapsed ? [] : comment.replies;
  // Replies the server hasn't sent yet ("Show N more replies" fetches the next batch).
  const hiddenReplies = collapsed ? 0 : Math.max(0, comment.replyCount - comment.replies.length);
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
    // React bubbles clicks out of portals (a hover card, a menu); only clicks on the row itself count.
    if (!e.currentTarget.contains(e.target as Node)) return;
    if ((e.target as HTMLElement).closest('a, button, textarea, input')) return;
    if (window.getSelection()?.toString()) return; // finishing a text selection is not a click
    w.select(comment, parentId);
  };
  // The row is focusable, so highlighting works from the keyboard too.
  const handleRowKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
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
  const isOwnComment = !!w.viewerId && author.id === w.viewerId;
  // What Copy puts on the clipboard: the text as read, tags as their @names.
  const copyText = deserializeBody(comment.body, comment.mentions, comment.projectRefs).text;

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
        role="group"
        tabIndex={0}
        aria-label={t('profile.wall.commentBy', { name })}
        onClick={handleRowClick}
        onKeyDown={handleRowKey}
        onMouseEnter={() => w.setHoverPath(pathHere)}
        onMouseLeave={() => w.setHoverPath(null)}
        className={cn(
          // -mx-3 px-3 keeps the avatar where the thread lines expect it while the row's
          // own background and ring get room around the content; pr-20 clears the corner actions.
          'group/row relative -mx-3 flex cursor-pointer gap-3 rounded-xl py-2 pl-3 pr-20 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/50',
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
        <UserHoverCard accountName={author.accountName} userId={author.id}>
          <Link to={profilePath(author.accountName)} className="block shrink-0">
            {author.avatarUrl
              ? <img src={author.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-8 rounded-full object-cover" />
              : <InitialsAvatar name={name} handle={author.accountName} className="size-8 rounded-full text-xs" />}
          </Link>
        </UserHoverCard>
        <div className="min-w-0 flex-1">
          {comment.pinned && (
            <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Icon name="push_pin" size={12} filled /> {t('profile.wall.pinned')}
            </p>
          )}
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <Link to={profilePath(author.accountName)} className="font-semibold text-zinc-100 hover:text-primary transition-colors">{name}</Link>
            <span className="text-xs text-zinc-500">
              {formatTimeAgo(comment.createdAt, t, settings.advanced?.timezone, language)}
              {comment.editedAt && (
                <Tip content={t('profile.wall.editedAt', { when: formatTimeAgo(comment.editedAt, t, settings.advanced?.timezone, language) })}>
                  <span className="ml-1 cursor-help">· {t('profile.wall.edited')}</span>
                </Tip>
              )}
            </span>
          </p>
          {comment.replyToMissing && (
            <p className="mt-0.5 flex items-center gap-1 text-xs italic text-zinc-500">
              <Icon name="reply" size={12} /> {t('profile.wall.replyToMissing')}
            </p>
          )}
          {editingThis ? (
            <div className="mt-1">
              <WallComposer
                autoFocus
                placeholder={t('profile.wall.editPlaceholder')}
                submitLabel={t('profile.wall.save')}
                busy={w.busy}
                onSubmit={body => w.edit(comment, body)}
                onCancel={() => w.setEditingId(null)}
                initialValue={deserializeBody(comment.body, comment.mentions, comment.projectRefs)}
              />
            </div>
          ) : (
            <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-300"><CommentBody comment={comment} /></p>
          )}
          <div className="mt-1 -ml-1.5 flex items-center gap-1 text-xs text-zinc-500">
            <span className="flex items-center">
              <Tip content={!w.signedIn ? t('profile.wall.signInToLike') : t(comment.likedByMe ? 'profile.wall.unlike' : 'profile.wall.like')}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t(comment.likedByMe ? 'profile.wall.unlike' : 'profile.wall.like')}
                  aria-pressed={comment.likedByMe}
                  disabled={!w.signedIn}
                  onClick={() => w.toggleLike(comment)}
                  className={cn(ACTION_BUTTON, comment.likedByMe ? 'text-rose-400 hover:text-rose-300' : 'text-zinc-500 hover:text-rose-400')}
                >
                  <Icon name="favorite" size={15} filled={comment.likedByMe} />
                </Button>
              </Tip>
              {comment.likeCount > 0 && <LikersPopover commentId={comment.id} count={comment.likeCount} />}
            </span>
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
            {comment.replyCount > 0 && !collapsed && (
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
        {/* The corner: pin (the wall's owner, top-level only), then everyone's ⋯ menu. */}
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
            <>
              {w.isOwner && comment.depth === 0 && (
                <Tip content={t(comment.pinned ? 'profile.wall.unpin' : 'profile.wall.pin')}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t(comment.pinned ? 'profile.wall.unpin' : 'profile.wall.pin')}
                    aria-pressed={comment.pinned}
                    onClick={() => w.togglePin(comment)}
                    className={cn(CORNER_BUTTON, comment.pinned ? 'text-primary opacity-100' : 'hover:text-primary')}
                  >
                    <Icon name="push_pin" size={15} filled={comment.pinned} />
                  </Button>
                </Tip>
              )}
              <CommentMenu
                commentId={comment.id}
                copyText={copyText}
                canEdit={comment.canEdit && !editingThis}
                canReport={w.signedIn && !isOwnComment}
                onEdit={() => w.setEditingId(comment.id)}
                onDelete={comment.canDelete ? () => setConfirmingDelete(true) : undefined}
              />
            </>
          )}
        </div>
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={() => w.toggleCollapsed(comment.id)}
          aria-expanded={false}
          className="ml-11 flex w-fit items-center gap-1 rounded-full border border-zinc-700 px-2.5 py-0.5 text-xs text-zinc-400 transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Icon name="expand_more" size={14} />
          {t('profile.wall.showReplies', { count: comment.descendantCount })}
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
              disabled={w.loadingRepliesFor === comment.id}
              onClick={() => void w.loadMoreReplies(comment)}
              className="mt-2 ml-11 flex w-fit items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-primary disabled:opacity-60"
            >
              {w.loadingRepliesFor === comment.id && <LogoLoader size={10} />}
              {t('profile.wall.moreReplies', { count: hiddenReplies })}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
