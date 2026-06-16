import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity as ActivityIcon } from 'lucide-react';
import { ActivityCard } from '@/features/feed/components/ActivityCard';
import { gqlRequest } from '@/app/graphql.client';

const GET_USER_ACTIVITY = `
  query UserActivity($offset: Int, $limit: Int) {
    userActivity(offset: $offset, limit: $limit) {
      activities {
        id
        actor { id accountName displayName avatarUrl }
        type
        projectId
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
  const [activities, setActivities] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { userActivity } = await gqlRequest(GET_USER_ACTIVITY, { offset: 0, limit: 50 });
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
      const { userActivity } = await gqlRequest(GET_USER_ACTIVITY, { offset, limit: 50 });
      setActivities(prev => [...prev, ...userActivity.activities]);
      setHasMore(userActivity.hasMore);
      setOffset(prev => prev + 50);
    } catch {
      // ignore
    }
  };

  if (activities === null) {
    return (
      <div className="flex items-center justify-center py-6 text-zinc-500">
        <div className="text-xs">{t('profile.loading') || 'Loading...'}</div>
      </div>
    );
  }

  if (!activities?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-zinc-500">
        <ActivityIcon className="size-10 mb-3 opacity-20" strokeWidth={1} />
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
