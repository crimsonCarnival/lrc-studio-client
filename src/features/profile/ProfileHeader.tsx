import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@ui/button';
import { LazyImage } from '@ui/LazyImage';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '@/shared/ui/Icon';
import { LevelBadge } from '@ui/LevelBadge';
import { InitialsAvatar } from '@/shared/ui/InitialsAvatar';
import { BadgeList } from '@/features/badges/BadgeList';
import { Tip } from '@/shared/ui/tip';
import { CountryFlag } from '@/shared/ui/CountryFlag';
import { WaveformBars } from '@/shared/ui/WaveformBars';
import { FollowButton } from './FollowButton';
import type { PublicUser } from '@/types';
import { usePresence } from '@/shared/hooks/usePresence';
import { useStreakResetHint } from '@/shared/hooks/useStreakResetHint';
import { formatDistanceToNow } from 'date-fns';
import { es as esLocale, enUS as enLocale } from 'date-fns/locale';

function AvatarBadge({ avatarUrl, name, handle, isOnline, size = 'lg' }: { avatarUrl?: string | null; name: string; handle?: string | null; isOnline?: boolean; size?: 'lg' | 'sm' }) {
  const sizeClass = size === 'lg' ? 'size-28 sm:size-32 text-5xl rounded-[1.5rem]' : 'size-16 text-2xl rounded-xl';
  if (avatarUrl) {
    return (
      <div className="relative inline-block shrink-0">
        <LazyImage
          src={avatarUrl}
          alt={name}
          className={`${sizeClass} object-cover border border-border shadow-inner-highlight ring-4 ring-zinc-900`}
        />
        {isOnline && (
          <span className="absolute -bottom-1 -right-1 size-5 rounded-full bg-green-500 border-[3px] border-zinc-900" />
        )}
      </div>
    );
  }
  return (
    <div className="relative inline-block shrink-0">
      {/* bg-background under the tint, so the waveform cover does not show through it. */}
      <div className={`${sizeClass} overflow-hidden bg-background border border-border shadow-inner-highlight ring-4 ring-zinc-900`}>
        <InitialsAvatar name={name} handle={handle} className="size-full" />
      </div>
      {isOnline && (
        <span className="absolute -bottom-1 -right-1 size-5 rounded-full bg-green-500 border-[3px] border-zinc-900" />
      )}
    </div>
  );
}

interface ProfileHeaderProps {
  profile: PublicUser;
  displayName: string;
  badgeIds: string[];
  level: number;
  xp: number;
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
  /** Owner-only: switches the page into the "view as others" preview. */
  onViewAsOthers?: () => void;
  /** Stats strip rendered along the bottom edge of the card. */
  children?: ReactNode;
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
        <Icon name="block" size={16} />
      </Button>
    </Tip>
  );
}

export function ProfileHeader({
  profile,
  displayName,
  badgeIds,
  level,
  xp,
  isOwner,
  isFollowing,
  followLoading,
  onFollow,
  onUnfollow,
  isBlocked,
  blockLoading,
  onBlock,
  onUnblock,
  onViewAsOthers,
  children,
}: ProfileHeaderProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('es') ? esLocale : enLocale;
  const presence = usePresence();
  const isOnline = presence.isOnline(profile.id);

  const xpForLevel = level * level * 100;
  const xpForNext = (level + 1) * (level + 1) * 100;
  const progress = xp - xpForLevel;
  const needed = xpForNext - xp;
  const xpPct = Math.max(0, Math.min(100, Math.round((progress / (xpForNext - xpForLevel)) * 100)));
  const xpTip = `${xp.toLocaleString()} XP · ${needed.toLocaleString()} to Lv.${level + 1} (${xpPct}%)`;
  const streakCurrent = profile.streak?.current ?? 0;
  const streakLongest = profile.streak?.longest ?? 0;
  const streakResetHint = useStreakResetHint();

  const copyProfileLink = () => {
    navigator.clipboard.writeText(window.location.href);
    // Ideally a toast would go here, but this is a lightweight solution
  };

  return (
    <div className="glass rounded-3xl relative overflow-hidden mb-6">
      {/* Decorative waveform cover */}
      <div className="h-24 sm:h-28 bg-primary/10 border-b border-border px-6 sm:px-8 overflow-hidden">
        <WaveformBars seed={profile.accountName || displayName} count={64} minHeight={10} className="justify-end" barClassName="bg-primary/25" />
      </div>

      <div className="px-6 sm:px-8 pb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
      <div className="-mt-14 sm:-mt-16">
        <AvatarBadge avatarUrl={profile.avatarUrl} name={displayName} handle={profile.accountName} isOnline={isOnline} />
      </div>

      <div className="flex-1 min-w-0 w-full text-center sm:text-left flex flex-col pt-1 sm:pt-4">
        
        {/* Row 1: Name, Badges, Level, and Action Buttons */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap justify-center sm:justify-start">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 truncate">{displayName}</h1>
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              {badgeIds.length > 0 && <BadgeList ids={badgeIds} max={3} />}
              <Tip content={xpTip} side="bottom">
                <span className="inline-flex h-6 items-center rounded-full bg-primary-soft px-2.5 font-mono text-[11px] font-semibold tracking-[0.08em] text-primary-ink cursor-default">
                  {t('common.levelShort', { level })}
                </span>
              </Tip>
              {(streakCurrent > 0 || streakLongest > 0) && (
                <Tip
                  content={<span className="flex flex-col gap-0.5"><span>{t('profile.streakLongest', { count: streakLongest })}</span><span className="text-muted-foreground">{streakResetHint}</span></span>}
                  side="bottom"
                >
                  <span className={`inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold cursor-default ${streakCurrent > 0
                    ? 'bg-gold-soft text-gold-ink'
                    : 'bg-raised text-subtle'}`}>
                    <Icon name="local_fire_department" size={14} />
                    {streakCurrent > 0 ? t('profile.streakDays', { count: streakCurrent }) : t('profile.streakNone')}
                  </span>
                </Tip>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start xl:justify-end gap-2 shrink-0">
            {isOwner ? (
              <>
                <Button asChild
                  variant="outline"
                  size="sm"
                  className="bg-zinc-800/50 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                ><Link to="/settings">
                  <Icon name="edit" size={16} className="mr-2 opacity-70" />
                  {t('profile.editProfile')}
                </Link></Button>
                {onViewAsOthers && (
                  <Tip content={t('profile.viewAsOthers')}>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={onViewAsOthers}
                      aria-label={t('profile.viewAsOthers')}
                      className="bg-zinc-800/50 hover:bg-zinc-700 border-zinc-700"
                    >
                      <Icon name="visibility" size={16} className="opacity-70" />
                    </Button>
                  </Tip>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
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
            <Tip content={t('share.title')}>
              <Button variant="outline" size="icon-sm" onClick={copyProfileLink} className="bg-zinc-800/50 hover:bg-zinc-700 border-zinc-700">
                <Icon name="share" size={16} className="opacity-70" />
              </Button>
            </Tip>
          </div>
        </div>

        {/* Row 2: Handle, Country, Last Online */}
        <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 flex-wrap">
          <p className="text-zinc-400 font-medium">{profile.accountName}</p>
          {(profile.country || (!isOnline && profile.lastOnlineAt)) && (
            <span className="text-zinc-600 px-1">•</span>
          )}
          {profile.country && <CountryFlag countryCode={profile.country} />}
          {!isOnline && profile.lastOnlineAt && (
            <p className="text-xs text-zinc-500 whitespace-nowrap">
              {(() => {
                const isNumeric = /^\d+$/.test(profile.lastOnlineAt as string);
                const date = new Date(isNumeric ? Number(profile.lastOnlineAt) : profile.lastOnlineAt);
                if (Number.isNaN(date.getTime())) return null;
                return (t as (k: string, opts: object) => string)('profile.lastSeen', { time: formatDistanceToNow(date, { addSuffix: true, locale: dateLocale }) });
              })()}
            </p>
          )}
        </div>

        {/* Row 3: Bio */}
        <p className="text-zinc-300 text-sm mt-3 max-w-2xl leading-relaxed">
          {profile.bio ? (
            profile.bio
          ) : isOwner ? (
            <span className="italic text-zinc-500">
              {t('profile.noBio')} <Link to="/settings" className="text-primary hover:underline">{t('profile.addBio')}</Link>
            </span>
          ) : (
            <span className="italic text-zinc-500">{t('profile.noBio')}</span>
          )}
        </p>

        {/* Level and XP (redesign sheet 10): where you are, and how far the next level is. */}
        <div className="mt-4 flex w-full max-w-sm flex-col gap-2 self-center sm:self-start">
          <span className="inline-flex items-center gap-1.5 self-center font-mono text-[13px] font-medium text-gold-ink sm:self-start">
            <Icon name="bolt" size={14} />
            {t('profile.xpProgress', { xp: xp.toLocaleString(), next: xpForNext.toLocaleString() })}
          </span>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={xpPct}
            aria-label={t('profile.xpToNext', { xp: needed.toLocaleString(), level: level + 1 })}
            className="h-2 overflow-hidden rounded-[4px] bg-hl"
          >
            <div className="h-full rounded-[4px] bg-linear-to-r from-iris to-gold" style={{ width: `${xpPct}%` }} />
          </div>
          <span className="text-left text-sm text-subtle">{t('profile.xpToNext', { xp: needed.toLocaleString(), level: level + 1 })}</span>
        </div>

        {profile.totalForksReceived > 0 && (
          <p className="text-xs text-primary/70 mt-3 font-medium">
            {t('profile.forkBadge', { count: profile.totalForksReceived })}
          </p>
        )}
      </div>
      </div>

      {children && <div className="border-t border-border">{children}</div>}
    </div>
  );
}
