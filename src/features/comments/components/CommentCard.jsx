import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { ReactionBar } from './ReactionBar';
import { CommentInput } from './CommentInput';
import { useCommentReplies } from '../hooks/useComments';
import { reactComment } from '../comments.service.js';

function timeAgo(isoString, t) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return t('library.justNow');
  if (mins < 60) return t('library.minutesAgo', { count: mins });
  if (hours < 24) return t('library.hoursAgo', { count: hours });
  return t('library.daysAgo', { count: days });
}

export function CommentCard({ comment, currentUserId, onDelete, onReply, depth = 0 }) {
  const { t } = useTranslation();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const { replies, loading: repliesLoading, loaded, load: loadReplies } = useCommentReplies(comment.id);
  const [localReactions, setLocalReactions] = useState(comment.reactions ?? []);
  const [myReaction, setMyReaction] = useState(comment.myReaction ?? null);

  const handleToggleReplies = () => {
    if (!repliesExpanded && !loaded) loadReplies();
    setRepliesExpanded(p => !p);
  };

  const handleReact = async (emoji) => {
    if (!currentUserId) return;
    const prevReactions = localReactions;
    const prevMyReaction = myReaction;
    // Optimistic toggle
    setMyReaction(emoji === myReaction ? null : emoji);
    try {
      const updated = await reactComment(comment.id, emoji);
      setLocalReactions(updated.reactions ?? []);
      setMyReaction(updated.myReaction ?? null);
    } catch {
      setLocalReactions(prevReactions);
      setMyReaction(prevMyReaction);
    }
  };

  const { user, text, isDeleted, createdAt, replyCount } = comment;

  return (
    <div className="flex gap-2.5">
      {/* Avatar */}
      <Link to={`/${user.accountName}`} className="shrink-0 mt-0.5">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.displayName || user.accountName} className="size-7 rounded-full object-cover" />
        ) : (
          <div className="size-7 rounded-full bg-gradient-to-br from-primary/25 to-violet-600/30 flex items-center justify-center text-[11px] font-bold text-white/80">
            {(user.displayName || user.accountName || '?').charAt(0).toUpperCase()}
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <Link to={`/${user.accountName}`} className="text-xs font-semibold text-zinc-200 hover:text-primary transition-colors">
            {user.displayName || user.accountName}
          </Link>
          <span className="text-[10px] text-zinc-600">{timeAgo(createdAt, t)}</span>
        </div>

        {/* Body */}
        {isDeleted ? (
          <p className="text-xs text-zinc-700 italic mt-0.5">{t('comments.deleted')}</p>
        ) : (
          <p className="text-sm text-zinc-300 mt-0.5 leading-relaxed whitespace-pre-wrap break-words">{text}</p>
        )}

        {/* Actions */}
        {!isDeleted && (
          <div className="flex items-center flex-wrap gap-3 mt-1.5">
            <ReactionBar
              reactions={localReactions}
              myReaction={myReaction}
              onReact={currentUserId ? handleReact : undefined}
              disabled={!currentUserId}
            />

            {depth === 0 && currentUserId && (
              <button
                onClick={() => setShowReplyInput(p => !p)}
                className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                {t('comments.reply')}
              </button>
            )}

            {currentUserId === user.id && (
              <button
                onClick={() => onDelete?.(comment.id)}
                className="ml-auto text-zinc-700 hover:text-red-400 transition-colors"
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
        )}

        {/* Inline reply input */}
        {showReplyInput && (
          <div className="mt-2">
            <CommentInput
              isReply
              autoFocus
              placeholder={t('comments.replyPlaceholder')}
              onSubmit={async (replyText) => {
                await onReply?.(replyText, comment.id);
                setShowReplyInput(false);
              }}
              onCancel={() => setShowReplyInput(false)}
            />
          </div>
        )}

        {/* Replies toggle */}
        {depth === 0 && replyCount > 0 && (
          <button
            onClick={handleToggleReplies}
            className="group flex items-center gap-1 text-[11px] text-zinc-500 hover:text-primary transition-colors mt-1.5"
          >
            {repliesExpanded
              ? <ChevronUp className="size-3 transition-transform" />
              : <ChevronDown className="size-3 transition-transform group-hover:translate-y-0.5" />}
            {repliesExpanded
              ? t('comments.hideReplies')
              : t('comments.replies_one', { count: replyCount })}
          </button>
        )}

        {/* CURVED THREAD LINES — vertical spine + per-reply elbow connectors */}
        {depth === 0 && repliesExpanded && (
          <div className="mt-2 ml-3.5 border-l border-zinc-800/60 flex flex-col gap-3">
            {repliesLoading && <div className="pl-4 text-xs text-zinc-600 animate-pulse">…</div>}
            {replies.map((reply) => (
              <div key={reply.id} className="relative pl-4">
                {/* Curved elbow: from spine right to reply */}
                <div className="absolute -left-px top-3 w-4 h-4 border-l border-b border-zinc-800/60 rounded-bl-xl pointer-events-none" />
                <CommentCard
                  comment={reply}
                  currentUserId={currentUserId}
                  onDelete={onDelete}
                  onReply={onReply}
                  depth={1}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
