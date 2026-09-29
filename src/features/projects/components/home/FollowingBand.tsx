import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Icon } from '@/shared/ui/Icon';
import { useFeed } from '@/features/feed/hooks/useFeed';
import { ActivityCard } from '@/features/feed/components/ActivityCard';

const PREVIEW_COUNT = 3;

/**
 * A short preview of the activity feed.
 *
 * Renders nothing when the feed is empty — which is the common case for a new
 * account following nobody, and an empty "from people you follow" band would be
 * a poor first impression rather than an invitation.
 */
export function FollowingBand() {
  const { t } = useTranslation();
  const { activities, loading } = useFeed(PREVIEW_COUNT);

  if (loading || activities.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon name="group" size={16} className="text-primary" />
          <h2 className="text-sm font-bold text-zinc-300">{t('home.following')}</h2>
        </div>
        <Link to="/feed" className="text-xs font-medium text-zinc-500 hover:text-zinc-200 transition-colors">
          {t('home.followingAll')}
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {activities.slice(0, PREVIEW_COUNT).map((a) => (
          <ActivityCard key={a.id} activity={a} />
        ))}
      </div>
    </section>
  );
}
