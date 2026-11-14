import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { Icon } from '@/shared/ui/Icon';
import { cn } from '@/shared/utils/utils';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import { Button } from '@ui/button';
import { useFeed } from './hooks/useFeed';
import { ActivityCard, type Activity } from './components/ActivityCard';
import { ActivityGroupCard } from './components/ActivityGroupCard';
import { FeedRail } from './components/FeedRail';
import { groupActivities, matchesFilter, type FeedFilter } from './group-activities';

const FILTERS: FeedFilter[] = ['all', 'projects', 'lists', 'people'];

// Stable pick per page load — empty state variants shouldn't flip on re-render
function pickRandom(arr: unknown): string {
  if (!Array.isArray(arr)) return arr as string;
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function FeedPage() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const { activities, hasMore, loading, loadingMore, error, loadMore } = useFeed();
  const [filter, setFilter] = useState<FeedFilter>('all');

  // Pick empty-state text once per mount
  const [emptyTitle] = useState(() => pickRandom(t('feed.empty.title', { returnObjects: true })));
  const [emptyCta]   = useState(() => pickRandom(t('feed.empty.cta',   { returnObjects: true })));

  const items = useMemo(
    () => groupActivities((activities as Activity[]).filter((a) => matchesFilter(a.type, filter)), user?.accountName),
    [activities, filter, user?.accountName],
  );

  // Guests cannot view the feed — redirect to login
  if (!user || user.isGuest) {
    return <Navigate to="/auth?action=signin" replace />;
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-subtle text-sm">
        {t('feed.error')}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="mx-auto flex w-full max-w-6xl items-start gap-8 px-4 py-8 sm:px-6">
        <div className="flex min-w-0 max-w-[720px] flex-1 flex-col gap-3.5">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-heading text-[32px] font-bold leading-tight text-foreground">{t('feed.title')}</h1>
            {activities.length > 0 && (
              <div role="group" aria-label={t('feed.filters.label')} className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={filter === f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      'h-9 rounded-pill px-3.5 text-[13px] font-medium transition-colors duration-[var(--duration-state)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                      filter === f
                        ? 'bg-foreground text-background'
                        : 'text-subtle inset-ring inset-ring-hl hover:text-foreground hover:inset-ring-faint',
                    )}
                  >
                    {t(`feed.filters.${f}`)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="size-14 rounded-2xl bg-raised flex items-center justify-center">
                <Icon name="rss_feed" size={28} className="text-subtle" />
              </div>
              <p className="text-sm text-foreground font-medium">{emptyTitle}</p>
              <p className="text-xs text-subtle">{emptyCta}</p>
            </div>
          ) : (
            <>
              {items.length === 0 && (
                <p className="py-14 text-center text-sm text-subtle">{t('feed.emptyFilter')}</p>
              )}
              {items.map((item) => item.kind === 'group'
                ? <ActivityGroupCard key={item.id} activities={item.activities} />
                : <ActivityCard key={item.activity.id} activity={item.activity} />)}

              {hasMore && (
                <Button
                  variant="outline"
                  onClick={loadMore}
                  loading={loadingMore}
                  className="mt-2 self-center"
                >
                  {t('feed.loadMore')}
                </Button>
              )}
            </>
          )}
        </div>

        <FeedRail />
      </div>
    </div>
  );
}
