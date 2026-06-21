import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@ui/button';
import { LazyImage } from '@ui/LazyImage';
import { useState } from 'react';
import { Settings, Timer, Trophy, Activity, BarChart3, Ban } from 'lucide-react';
import { BadgeList } from '@/features/badges/BadgeList';
import { Tip } from '@/shared/ui/tip';
import { FollowButton } from './FollowButton';
import type { PublicUser } from '@/types';

function AvatarBadge({ avatarUrl, name, size = 'lg' }: { avatarUrl?: string | null; name: string; size?: 'lg' | 'sm' }) {
  const sizeClass = size === 'lg' ? 'size-24 text-4xl rounded-[1.5rem]' : 'size-16 text-2xl rounded-xl';
  if (avatarUrl) {
    return (
      <LazyImage
        src={avatarUrl}
        alt={name}
        className={`${sizeClass} object-cover border-4 border-border shadow-2xl shadow-primary/20`}
      />
    );
  }
  return (
    <div className={`${sizeClass} bg-gradient-to-br from-primary/80 to-accent-purple flex items-center justify-center border-4 border-border shadow-2xl shadow-primary/20 font-bold text-zinc-950 select-none`}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

interface ProfileHeaderProps {
  profile: PublicUser;
  displayName: string;
  badgeIds: string[];
  level: number;
  minutesLabel: string | null;
  isOwner: boolean;
  isFollowing: boolean;
  followLoading: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  isBlocked: boolean;
  blockLoading: boolean;
  onBlock: () => void;
  onUnblock: () => void;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
}

/** Block toggle with two-step confirm; parent owns isBlocked + the API calls. */
function BlockControl({ isBlocked, blockLoading, onBlock, onUnblock }: {
  isBlocked: boolean; blockLoading: boolean; onBlock: () => void; onUnblock: () => void;
}) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);

  if (isBlocked) {
    return (
      <Button variant="outline" size="sm" onClick={onUnblock} disabled={blockLoading}
        className="text-destructive border-destructive/40 hover:bg-destructive/10">
        {t('profile.unblock')}
      </Button>
    );
  }
  if (confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => { setConfirming(false); onBlock(); }}
        disabled={blockLoading} className="text-destructive border-destructive/40 hover:bg-destructive/10">
        {t('profile.confirmBlock')}
      </Button>
    );
  }
  return (
    <Tip content={t('profile.block')}>
      <Button variant="outline" size="icon-sm" onClick={() => setConfirming(true)} disabled={blockLoading}
        className="text-muted-foreground hover:text-destructive">
        <Ban className="size-4" />
      </Button>
    </Tip>
  );
}

export function ProfileHeader({
  profile,
  displayName,
  badgeIds,
  level,
  minutesLabel,
  isOwner,
  isFollowing,
  followLoading,
  onFollow,
  onUnfollow,
  isBlocked,
  blockLoading,
  onBlock,
  onUnblock,
  onOpenFollowers,
  onOpenFollowing,
}: ProfileHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="glass rounded-[2rem] p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden mb-6">
      <AvatarBadge avatarUrl={profile.avatarUrl} name={displayName} />

      <div className="flex-1 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row sm:items-start gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <h1 className="text-2xl font-semibold text-foreground">{displayName}</h1>
              {level > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-800/80 border border-zinc-700/50 text-[11px] font-bold text-zinc-400">
                  <Trophy className="size-3 text-warning" />
                  Lv.{level}
                </span>
              )}
            </div>
            {badgeIds.length > 0 && (
              <BadgeList ids={badgeIds} max={3} className="mt-1.5 justify-center sm:justify-start" />
            )}
          </div>
        </div>

        <p className="text-muted-foreground text-sm font-mono mt-1.5">@{profile.accountName}</p>

        <p className="text-muted-foreground text-sm mt-3 max-w-md">
          {profile.bio || <span className="italic opacity-50">{t('profile.noBio')}</span>}
        </p>

        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 mt-4 text-sm text-muted-foreground">
          {profile.showFollowers && profile.followerCount > 0 ? (
            <button
              onClick={onOpenFollowers}
              className="hover:text-foreground transition-colors"
            >
              {t('profile.statsFollowers', { count: profile.followerCount })}
            </button>
          ) : (
            <span>{t('profile.statsFollowers', { count: profile.followerCount })}</span>
          )}
          <span className="opacity-30">·</span>
          {profile.showFollowers && profile.followingCount > 0 ? (
            <button
              onClick={onOpenFollowing}
              className="hover:text-foreground transition-colors"
            >
              {t('profile.statsFollowing', { count: profile.followingCount })}
            </button>
          ) : (
            <span>{t('profile.statsFollowing', { count: profile.followingCount })}</span>
          )}
          <span className="opacity-30">·</span>
          <span>{t('profile.statsProjects', { count: profile.projectCount })}</span>
          <span className="opacity-30">·</span>
          <span>{t('profile.statsStars', { count: profile.totalStarsReceived })}</span>
          {minutesLabel && (
            <>
              <span className="opacity-30">·</span>
              <span className="flex items-center gap-1">
                <Timer className="size-3.5 text-accent-blue" />
                {minutesLabel}
                <span className="text-xs opacity-50">¹</span>
              </span>
            </>
          )}
        </div>

        {minutesLabel && (
          <p className="text-[10.5px] text-muted-foreground mt-1 opacity-50">
            ¹ {t('badges.leaderboard.minutesSyncedNote')}
          </p>
        )}

        {profile.totalForksReceived > 0 && (
          <p className="text-xs text-muted-foreground mt-2 opacity-70">
            {t('profile.forkBadge', { count: profile.totalForksReceived })}
          </p>
        )}
      </div>

      {isOwner ? (
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
          <Tip content={t('profile.tabs.activity')}>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => navigate('/settings/activity')}
            >
              <Activity className="size-4" />
            </Button>
          </Tip>
          <Tip content={t('profile.tabs.stats')}>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => navigate('/settings/stats')}
            >
              <BarChart3 className="size-4" />
            </Button>
          </Tip>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5"
          >
            <Settings className="size-4" />
            {t('profile.editProfile')}
          </Button>
        </div>
      ) : (
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
          {!isBlocked && (
            <FollowButton
              isFollowing={isFollowing}
              followLoading={followLoading}
              onFollow={onFollow}
              onUnfollow={onUnfollow}
            />
          )}
          <BlockControl
            isBlocked={isBlocked}
            blockLoading={blockLoading}
            onBlock={onBlock}
            onUnblock={onUnblock}
          />
        </div>
      )}
    </div>
  );
}
