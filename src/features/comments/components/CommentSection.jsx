import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useComments } from '../hooks/useComments';
import { CommentCard } from './CommentCard';
import { CommentInput } from './CommentInput';

export function CommentSection({ projectId }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const {
    comments, total, hasMore, loading, loadingMore, error,
    loadMore, postComment, deleteComment,
  } = useComments(projectId);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-zinc-600 text-center py-6">{t('feed.error')}</p>;
  }

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
        {t('comments.title')}
        {total > 0 && <span className="ml-2 font-normal normal-case text-zinc-600">{total}</span>}
      </h2>

      {user && !user.isGuest ? (
        <CommentInput onSubmit={(text) => postComment(text)} />
      ) : (
        <button
          onClick={() => navigate('/auth?action=signin')}
          className="text-xs text-zinc-600 hover:text-primary transition-colors text-left"
        >
          {t('comments.signInToComment')} →
        </button>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-zinc-600 text-center py-6">{t('comments.empty')}</p>
      ) : (
        <div className="flex flex-col gap-5">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              currentUserId={user?.id ?? null}
              onDelete={deleteComment}
              onReply={(text, parentId) => postComment(text, parentId)}
            />
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="py-2.5 px-4 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 text-sm text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loadingMore
                ? <Loader2 className="size-4 animate-spin" />
                : t('explore.page.loadMore')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
