import { profilePath } from '@/features/profile/profile-path';
import { StaffRing } from '@/shared/ui/StaffRing';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LazyImage } from '@ui/LazyImage';
import { Button } from '@ui/button';
import { CountryFlag } from '@ui/CountryFlag';
import { Icon } from '@/shared/ui/Icon';
import { followUser, unfollowUser } from '@/features/profile/profile.service';
import type { FollowUser } from '@/types';
import { Highlight } from './Highlight';
import { UserHoverCard } from '@ui/UserHoverCard';

type SearchUserCardProps = {
  user: FollowUser;
  query: string;
  /** Signed-in viewer who is not this user. Guests and your own row get no follow button. */
  canFollow: boolean;
};

/** One row per user with its actions inline (redesign sheet 19), instead of a hover card under the row. */
export function SearchUserCard({ user, query, canFollow }: SearchUserCardProps) {
  const { t } = useTranslation();
  const { accountName, displayName, avatarUrl, country } = user;
  const name = displayName || accountName;
  const level = user.level ?? 0;
  // Local override of the server flag; null until the viewer acts on this row.
  const [followOverride, setFollowOverride] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const following = followOverride ?? user.isFollowedByMe;
  // Keeps the follower count in step with the button without refetching the search.
  const followerDelta = followOverride === null ? 0 : Number(followOverride) - Number(user.isFollowedByMe);

  const toggleFollow = async () => {
    setPending(true);
    try {
      await (following ? unfollowUser(accountName) : followUser(accountName));
      setFollowOverride(!following);
    } catch {
      // The button keeps its previous state; the request layer already reports the error.
    } finally {
      setPending(false);
    }
  };

  return (
    <article className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[18px] bg-background px-[18px] py-4 inset-ring inset-ring-hl transition-shadow duration-[var(--duration-state)] hover:inset-ring-faint">
      <UserHoverCard accountName={accountName} userId={user.id}>
        <span className="flex min-w-0 flex-1 items-center gap-x-4 gap-y-3">
          <StaffRing role={user.staffRole}>
            <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft font-heading text-[22px] font-bold text-primary-ink uppercase">
              {avatarUrl ? <LazyImage src={avatarUrl} alt="" className="size-full object-cover" /> : name.charAt(0)}
            </span>
          </StaffRing>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex min-w-0 items-center gap-2">
              <Link to={profilePath(accountName)} className="truncate font-heading text-xl leading-tight font-bold tracking-[-0.02em] text-foreground hover:underline">
                <Highlight text={name} query={query} />
              </Link>
              {level > 0 && (
                <span className="inline-flex h-[22px] shrink-0 items-center rounded-full bg-primary-soft px-2 font-mono text-[11px] font-semibold text-primary-ink">
                  {t('settings.levelShort', { level })}
                </span>
              )}
            </span>
            <span className="flex min-w-0 items-center gap-2 text-sm text-subtle">
              <span className="truncate font-mono text-xs">@<Highlight text={accountName} query={query} /></span>
              {/* Only present when the user chose to show their country. */}
              {country && <><span aria-hidden>·</span><CountryFlag countryCode={country} /></>}
            </span>
            <span className="truncate font-mono text-xs font-medium text-subtle">
              {t('search.statProjects', { count: user.projectCount ?? 0 })}
              {' · '}
              {t('search.statStars', { count: user.totalStarsReceived ?? 0 })}
              {' · '}
              {t('search.statFollowers', { count: Math.max(0, (user.followerCount ?? 0) + followerDelta) })}
            </span>
          </span>
        </span>
      </UserHoverCard>
      <div className="flex shrink-0 items-center gap-2 max-sm:w-full">
        <Button asChild variant="outline" className="h-10 px-3.5 text-[15px] max-sm:flex-1 lg:h-10 lg:px-3.5 lg:text-[15px] coarse:h-11">
          <Link to={profilePath(accountName)}>{t('search.viewProfile')}</Link>
        </Button>
        {canFollow && (
          <Button
            variant={following ? 'outline' : 'default'}
            aria-pressed={following}
            loading={pending}
            onClick={toggleFollow}
            className="h-10 gap-2 px-3.5 text-[15px] max-sm:flex-1 lg:h-10 lg:px-3.5 lg:text-[15px] coarse:h-11"
          >
            <Icon name={following ? 'check' : 'add'} size={16} />
            {following ? t('profile.following') : t('profile.follow')}
          </Button>
        )}
      </div>
    </article>
  );
}
