import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useFeed } from './hooks/useFeed';
import { ActivityCard } from './components/ActivityCard';

// Stable pick per page load — empty state variants shouldn't flip on re-render
function pickRandom(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function FeedPage() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const { activities, hasMore, loading, loadingMore, error, loadMore } = useFeed();

  // Pick empty-state text once per mount
  const emptyTitle = useRef(pickRandom(t('feed.empty.title', { returnObjects: true }))).current;
  const emptyCta   = useRef(pickRandom(t('feed.empty.cta',   { returnObjects: true }))).current;

  // Guests cannot view the feed — redirect to login
  if (!user || user.isGuest) {
    return <Navigate to="/auth?action=signin" replace />;
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
        {t('feed.error')}
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full py-6 px-4">
      <h1 className="text-xl font-semibold text-white mb-6">{t('feed.title')}</h1>

      {activities.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <p className="font-medium mb-1">{emptyTitle}</p>
          <p className="text-sm">{emptyCta}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activities.map(activity => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingMore
                ? <Loader2 className="size-4 animate-spin" />
                : t('feed.loadMore')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
