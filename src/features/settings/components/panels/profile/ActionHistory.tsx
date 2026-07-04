import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { ActivityCard } from '@/features/feed/components/ActivityCard';
import { gqlRequest } from '@/app/graphql.client';
import { Skeleton } from '@ui/skeleton';

interface ActivityItem {
  id: string;
  actor: { accountName: string; avatarUrl?: string; displayName?: string };
  type: string;
  publicId?: string;
  projectTitle?: string;
  coverImage?: string;
  targetPath?: string;
  createdAt: string;
}

interface UserActivityResult {
  userActivity: { activities: ActivityItem[]; hasMore: boolean };
}

function ActionHistorySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30">
          <Skeleton className="size-9 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

const GET_USER_ACTIVITY = /* GraphQL */ `
  query UserActivity($offset: Int, $limit: Int) {
    userActivity(offset: $offset, limit: $limit) {
      activities {
        id
        actor { id accountName displayName avatarUrl }
        type
        publicId
        projectTitle
        coverImage
        targetPath
        createdAt
      }
      hasMore
    }
  }
`;

export default function ActionHistory() {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<ActivityItem[] | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { userActivity } = await gqlRequest(GET_USER_ACTIVITY, { offset: 0, limit: 50 }) as UserActivityResult;
        if (isMounted) {
          setActivities(userActivity.activities);
          setHasMore(userActivity.hasMore);
          setOffset(50);
        }
      } catch {
        if (isMounted) {
          setActivities([]);
          setHasMore(false);
        }
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const loadMore = async () => {
    try {
      const { userActivity } = await gqlRequest(GET_USER_ACTIVITY, { offset, limit: 50 }) as UserActivityResult;
      setActivities(prev => [...(prev ?? []), ...userActivity.activities]);
      setHasMore(userActivity.hasMore);
      setOffset(prev => prev + 50);
    } catch {
      // ignore
    }
  };

  if (activities === null) {
    return <ActionHistorySkeleton />;
  }

  if (!activities?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-zinc-500">
        <Icon name="monitoring" size={40} className="mb-3 opacity-20" />
        <p className="text-xs">{t('profile.noHistory')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map(activity => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
      {hasMore && (
        <button
          onClick={loadMore}
          className="w-full text-xs text-zinc-400 hover:text-zinc-300 py-3 transition-colors"
        >
          {t('common.loadMore') || 'Load more...'}
        </button>
      )}
    </div>
  );
}
