import { profilePath } from '@/features/profile/profile-path';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { useSuggestedUsers } from '../hooks/useExplore';
import { useFollowToggle } from '../hooks/useFollowToggle';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { UserHoverCard } from '@ui/UserHoverCard';
import { UserAvatar } from '@ui/UserAvatar';
import { LogoLoader } from '@ui/LogoLoader';
import { Button } from '@ui/button';
import { cn } from '@/shared/utils/utils';
import type { SuggestionReason as Reason } from '@/types/graphql';
import { SuggestionReason } from './SuggestionReason';
import { suggestionReasonText } from '../suggestion-reason';

interface SuggestedUser {
  id: string;
  accountName: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  staffRole?: string | null;
  isFollowedByMe?: boolean | null;
  suggestionReason?: Reason | null;
}

type Variant = 'grid' | 'rail';

/**
 * People to follow, each with the reason they are suggested. `grid` is the Explore section;
 * `rail` is the compact list in the feed's side column.
 */
export function SuggestedUsers({ limit = 8, variant = 'grid', className }: { limit?: number; variant?: Variant; className?: string }) {
  const { t } = useTranslation();
  const { user: me } = useAuthContext();
  const { users, loading, error } = useSuggestedUsers(limit) as {
    users: SuggestedUser[];
    loading: boolean;
    error: unknown;
  };
  const follow = useFollowToggle();
  const rail = variant === 'rail';

  const followButton = (u: SuggestedUser) => {
    if (!me || me.isGuest || me.accountName === u.accountName) return null;
    const following = follow.isFollowing(u.accountName, u.isFollowedByMe);
    return (
      <Button
        type="button"
        size="sm"
        variant={following ? 'outline' : 'default'}
        aria-pressed={following}
        disabled={follow.isPending(u.accountName)}
        onClick={() => void follow.toggle(u.accountName, following)}
        className={cn('relative z-10 gap-1.5', !rail && 'w-full')}
      >
        {following && <Icon name="check" size={14} />}
        {following ? t('explore.suggested.following') : t('explore.suggested.follow')}
      </Button>
    );
  };

  const heading = rail ? (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-heading text-[15px] font-semibold text-foreground">{t('explore.suggested.shortTitle')}</h2>
      <Link to="/explore" className="text-[13px] font-medium text-primary-ink hover:text-foreground">{t('feed.rail.explore')}</Link>
    </div>
  ) : (
    <h2 className="font-heading text-xl font-semibold text-foreground">{t('explore.suggested.title')}</h2>
  );

  let body;
  if (loading) {
    body = <div className="flex justify-center py-8"><LogoLoader size={24} className="text-subtle" /></div>;
  } else if (error || users.length === 0) {
    body = <p className="py-6 text-center text-sm text-subtle">{t('explore.suggested.empty')}</p>;
  } else if (rail) {
    body = (
      <ul className="flex flex-col gap-3">
        {users.map((u) => (
          <li key={u.id} className="flex items-center gap-2.5">
            <div className="min-w-0 flex-1">
            <UserHoverCard accountName={u.accountName} userId={u.id} className="block min-w-0">
              <Link to={profilePath(u.accountName)} className="flex min-w-0 items-center gap-2.5">
                <UserAvatar {...u} className="size-9 text-sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">{u.displayName || u.accountName}</span>
                  {u.suggestionReason && (
                    <span className="block truncate text-xs text-subtle">{suggestionReasonText(u.suggestionReason, t)}</span>
                  )}
                </span>
              </Link>
            </UserHoverCard>
            </div>
            <span className="shrink-0">{followButton(u)}</span>
          </li>
        ))}
      </ul>
    );
  } else {
    body = (
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {users.map((u) => (
          // The whole card opens the profile through a stretched link; the follow button
          // sits above it (z-10), so it is a sibling rather than nested interactive content.
          <li
            key={u.id}
            className="relative flex flex-col gap-3.5 rounded-[var(--radius-card)] bg-raised p-[18px] inset-ring inset-ring-hl transition-shadow duration-[var(--duration-state)] hover:inset-ring-faint"
          >
            <Link
              to={profilePath(u.accountName)}
              aria-label={u.displayName || u.accountName}
              className="absolute inset-0 rounded-[var(--radius-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
            <UserHoverCard accountName={u.accountName} userId={u.id}>
              {/* Only here so the hover card gets hover; the stretched link above is the row's real link. */}
              <Link
                to={profilePath(u.accountName)}
                tabIndex={-1}
                aria-hidden="true"
                className="relative flex w-fit max-w-full min-w-0 items-center gap-3"
              >
                <UserAvatar {...u} className="size-12 text-lg" />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-foreground">{u.displayName || u.accountName}</p>
                  <p className="truncate text-[13px] text-subtle">@{u.accountName}</p>
                </div>
              </Link>
            </UserHoverCard>
            <SuggestionReason reason={u.suggestionReason} className="min-h-8" />
            <div className="mt-auto">{followButton(u)}</div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className={cn('flex flex-col', rail ? 'gap-3' : 'gap-4', className)}>
      {heading}
      {body}
    </section>
  );
}
