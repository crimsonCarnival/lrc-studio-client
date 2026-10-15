import { InitialsAvatar } from '@/shared/ui/InitialsAvatar';
import { StaffRing } from '@/shared/ui/StaffRing';
import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { BadgeList } from '@/features/badges/BadgeList';
import { LazyImage } from '@ui/LazyImage';
import { Button } from '@ui/button';
import { cn } from '@/shared/utils/utils';
import toast from 'react-hot-toast';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@ui/dropdown-menu';
import { CountryFlag } from '@ui/CountryFlag';
import { usePresence } from '@/shared/hooks/usePresence';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { followUser, unfollowUser } from '@/features/profile/profile.service';
import { useQuery } from '@tanstack/react-query';
import { gqlRequest } from '@/app/graphql.client';
import { formatDistanceToNow } from 'date-fns';
import { es as esLocale, enUS as enLocale } from 'date-fns/locale';

interface MiniProfile {
  id: string;
  accountName: string;
  displayName: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  staffRole?: string | null;
  bio: string | null;
  isVerified: boolean;
  followerCount: number;
  followingCount: number;
  projectCount: number;
  totalStarsReceived: number;
  isFollowedByMe: boolean;
  isFollowingMe: boolean;
  miniProfileBadgeIds: string[];
  country: string | null;
  lastOnlineAt: string | null;
  progression: { xp: number; level: number } | null;
}

async function fetchMiniProfile(accountName: string): Promise<MiniProfile | null> {
  const data = await gqlRequest<{ publicProfile: MiniProfile | null }>(/* GraphQL */ `
    query MiniProfile($accountName: String!) {
      publicProfile(accountName: $accountName) {
        id accountName displayName avatarUrl coverImageUrl staffRole bio isVerified
        followerCount followingCount projectCount totalStarsReceived
        isFollowedByMe isFollowingMe miniProfileBadgeIds
        country
        lastOnlineAt
        progression { xp level }
      }
    }
  `, { accountName });
  return data.publicProfile;
}

// The same people recur across feeds and lists; hovering one again within a
// minute reuses the card instead of refetching it.
const MINI_PROFILE_STALE_MS = 60_000;

interface UserHoverCardProps {
  accountName: string;
  userId?: string;
  children: ReactNode;
}

const OPEN_DELAY = 280;
const CLOSE_DELAY = 120;

export function UserHoverCard({ accountName, userId, children }: UserHoverCardProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('es') ? esLocale : enLocale;
  const { user: me } = useAuthContext();
  const presence = usePresence();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  // Shared timer used for both open-delay and close-delay
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });
  // Fetched on first open. Keyed under 'profile', so a follow made anywhere
  // updates this card and signing out clears it (see cache-sync).
  const { data } = useQuery({
    queryKey: ['profile', accountName, 'mini'],
    queryFn: () => fetchMiniProfile(accountName),
    enabled: open,
    staleTime: MINI_PROFILE_STALE_MS,
  });
  const profile = data ?? null;
  // Optimistic override while a follow request is in flight; the cache holds the settled value.
  const [following, setFollowing] = useState<boolean | null>(null);
  const [followPending, setFollowPending] = useState(false);
  const [followHover, setFollowHover] = useState(false);
  // The ⋯ menu portals outside the card, so leaving the card for it must not close the card.
  const menuOpenRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const updatePos = useCallback(() => {
    if (!triggerRef.current || !cardRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const cardRect = cardRef.current.getBoundingClientRect();
    const cardH = cardRect.height;
    const cardW = cardRect.width;
    let top = rect.bottom + 8 + window.scrollY;
    let left = rect.left + window.scrollX;
    if (rect.bottom + cardH + 8 > window.innerHeight) top = rect.top - cardH - 8 + window.scrollY;
    if (left + cardW > window.innerWidth + window.scrollX) left = window.innerWidth + window.scrollX - cardW - 8;
    left = Math.max(8 + window.scrollX, left);
    setPos({ top, left });
  }, []);

  const startOpen = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => setOpen(true), OPEN_DELAY);
  }, [clearTimer]);

  const startClose = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => { if (!menuOpenRef.current) setOpen(false); }, CLOSE_DELAY);
  }, [clearTimer]);

  const cancelClose = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  useEffect(() => {
    if (open) {
      updatePos();
    }
  }, [open, profile, updatePos]);

  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [open]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const isSelf = me?.accountName === accountName;
  const effectiveId = userId ?? profile?.id ?? '';
  const isOnline = presence.isOnline(effectiveId);
  const activity = presence.getActivity(effectiveId);

  const isFollowedByMe = following ?? profile?.isFollowedByMe ?? false;
  const isFollowingMe = profile?.isFollowingMe ?? false;

  const handleFollowToggle = async () => {
    if (!profile || followPending) return;
    setFollowPending(true);
    const nowFollowing = !isFollowedByMe;
    setFollowing(nowFollowing);
    try {
      if (nowFollowing) await followUser(accountName);
      else await unfollowUser(accountName);
    } catch {
      // The cache was never updated, so dropping the override reverts the button.
    } finally {
      setFollowing(null);
      setFollowPending(false);
    }
  };

  const displayName = profile?.displayName || accountName;
  const countryName = (() => {
    if (!profile?.country) return '';
    try { return new Intl.DisplayNames([i18n.language || 'en', 'en'], { type: 'region' }).of(profile.country) ?? profile.country; }
    catch { return profile.country; }
  })();
  const lastSeen = (() => {
    if (isOnline || !profile?.lastOnlineAt) return null;
    const isNumeric = /^\d+$/.test(profile.lastOnlineAt);
    const date = new Date(isNumeric ? Number(profile.lastOnlineAt) : profile.lastOnlineAt);
    if (Number.isNaN(date.getTime())) return null;
    return (t as (k: string, opts: object) => string)('profile.lastSeen', { time: formatDistanceToNow(date, { addSuffix: true, locale: dateLocale }) });
  })();
  const copyProfileLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/profile/${accountName}`)
      .then(() => toast.success(t('profile.mini.linkCopied')))
      .catch(() => { /* clipboard unavailable */ });
  };

  // Follow button label
  const followLabel = isFollowedByMe
    ? t('profile.following')
    : isFollowingMe
      ? t('profile.followBack')
      : t('profile.follow');

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={startOpen}
        onMouseLeave={startClose}
        className="inline-block"
      >
        {children}
      </span>

      {open && createPortal(
        <div
          ref={cardRef}
          onMouseEnter={cancelClose}
          onMouseLeave={startClose}
          role="dialog"
          aria-busy={!profile}
          aria-label={profile ? t('profile.mini.cardLabel', { name: displayName }) : t('profile.mini.loading')}
          style={{ position: 'absolute', top: pos.top, left: pos.left, width: 340, visibility: pos.top === -9999 ? 'hidden' : 'visible' }}
          // z-popover, the same level as menus: the card's own "more" menu is portaled to
          // <body> after the card, so at equal z-index it paints above. A higher value here
          // (it was 9999) buries that menu behind the card.
          className="z-popover bg-zinc-900 border border-zinc-800 rounded-2xl shadow-[0_18px_40px_rgba(0,0,0,.5)] flex flex-col overflow-hidden animate-fade-in"
        >
          {!profile ? (
            <MiniProfileSkeleton />
          ) : (
            <>
              {profile.coverImageUrl && (
                <div className="h-16 w-full overflow-hidden bg-zinc-800">
                  <LazyImage src={profile.coverImageUrl} alt="" className="size-full object-cover" />
                </div>
              )}
              <div className={cn('flex items-start gap-3.5 px-[18px] pb-3.5', profile.coverImageUrl ? '-mt-7 pt-0' : 'pt-[18px]')}>
                <Link to={`/profile/${accountName}`} onClick={() => setOpen(false)} className="relative shrink-0">
                  <StaffRing role={profile.staffRole} className="rounded-2xl">
                    {profile.avatarUrl ? (
                      <LazyImage src={profile.avatarUrl} alt={accountName} className="size-14 rounded-2xl object-cover" />
                    ) : (
                      <InitialsAvatar name={displayName} handle={accountName} className="size-14 rounded-2xl text-[26px]" />
                    )}
                  </StaffRing>
                  {isOnline && <span title={t('common.online')} className="absolute -right-[3px] -bottom-[3px] size-3.5 rounded-full bg-emerald-400 border-[3px] border-zinc-900" />}
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Link to={`/profile/${accountName}`} onClick={() => setOpen(false)} className="text-[17px] font-bold leading-tight text-zinc-100 truncate hover:underline">
                      {displayName}
                    </Link>
                    {profile.isVerified && <Icon name="verified" size={16} className="text-primary shrink-0" aria-label={t('profile.verified')} />}
                  </div>
                  <div className="font-mono text-[13px] text-zinc-400 mt-0.5" title={lastSeen ?? undefined}>
                    {accountName}
                    {isFollowingMe && (
                      <span className="ml-1 px-1.5 py-px rounded-md bg-zinc-800 font-sans text-[11px] font-semibold text-zinc-100">{t('profile.followsYou')}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[13px] text-zinc-400">
                    {profile.country && (
                      <span className="flex items-center gap-1.5"><CountryFlag countryCode={profile.country} />{countryName}</span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-violet-200 text-[11px] font-bold font-mono">
                      {t('profile.levelLabel')} {profile.progression?.level ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {activity && (
                <div className="mx-[18px] mb-3 flex items-center gap-1.5 text-xs text-primary/80 bg-primary/10 rounded-lg px-2.5 py-1.5">
                  <Icon name="music_note" size={12} className="shrink-0 animate-pulse" />
                  <span className="truncate">{t('profile.syncingActivity', { song: activity.songName || activity.projectTitle })}</span>
                </div>
              )}

              {profile.bio && (
                <p className="mx-[18px] mb-3 text-[13px] text-zinc-400 line-clamp-2 leading-relaxed">{profile.bio}</p>
              )}

              {profile.miniProfileBadgeIds.length > 0 && (
                <BadgeList ids={profile.miniProfileBadgeIds} max={profile.miniProfileBadgeIds.length} className="px-[18px] pb-3.5" />
              )}

              <nav aria-label={t('profile.mini.stats')} className="grid grid-cols-4 border-t border-zinc-800">
                {[
                  { value: profile.followerCount, label: t('profile.mini.followers', { count: profile.followerCount }), to: `/profile/${accountName}` },
                  { value: profile.followingCount, label: t('profile.mini.following', { count: profile.followingCount }), to: `/profile/${accountName}` },
                  { value: profile.projectCount, label: t('profile.mini.projects', { count: profile.projectCount }), to: `/profile/${accountName}` },
                  { value: profile.totalStarsReceived, label: t('profile.mini.stars', { count: profile.totalStarsReceived }) },
                ].map(({ value, label, to }) => {
                  const body = (
                    <>
                      <b className="block text-[17px] font-extrabold text-zinc-100">{value}</b>
                      <span className="block text-xs text-zinc-400 mt-px">{label}</span>
                    </>
                  );
                  return to ? (
                    <Link key={label} to={to} onClick={() => setOpen(false)} className="py-3 text-center hover:bg-zinc-800/50 transition-colors">{body}</Link>
                  ) : (
                    <div key={label} className="py-3 text-center">{body}</div>
                  );
                })}
              </nav>

              <div className="flex gap-2 px-[18px] pt-3 pb-4 border-t border-zinc-800">
                {me && !isSelf && (
                  <Button
                    type="button"
                    variant={isFollowedByMe ? 'outline' : 'default'}
                    aria-pressed={isFollowedByMe}
                    onClick={handleFollowToggle}
                    onMouseEnter={() => setFollowHover(true)}
                    onMouseLeave={() => setFollowHover(false)}
                    disabled={followPending}
                    className={cn(
                      'flex-[1.2] h-10 text-sm lg:h-10 lg:text-sm',
                      isFollowedByMe && followHover && 'bg-red-950/50 text-red-300 inset-ring-red-900/60 hover:bg-red-950/50 hover:inset-ring-red-900/60',
                    )}
                  >
                    {isFollowedByMe ? (followHover ? t('profile.mini.unfollow') : t('profile.following')) : followLabel}
                  </Button>
                )}
                <Link
                  to={`/profile/${accountName}`}
                  onClick={() => setOpen(false)}
                  className="flex-1 h-10 grid place-items-center rounded-[10px] border border-zinc-700 text-sm font-semibold text-zinc-100 hover:bg-zinc-800/60 transition-colors"
                >
                  {t('profile.mini.viewProfile')}
                </Link>
                <DropdownMenu onOpenChange={(o) => { menuOpenRef.current = o; if (!o) startClose(); }}>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="icon" aria-label={t('profile.mini.moreOptions')} className="size-10 lg:size-10">
                      <Icon name="more_horiz" size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onMouseEnter={cancelClose}>
                    <DropdownMenuItem onClick={copyProfileLink}>
                      <Icon name="link" />
                      {t('profile.mini.copyLink')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

/** Placeholder with the same silhouette as the loaded card. */
function MiniProfileSkeleton() {
  const sk = 'bg-zinc-800 rounded-md animate-pulse';
  return (
    <>
      <div className="flex gap-3.5 px-[18px] pt-[18px] pb-3.5">
        <div className={cn(sk, 'size-14 rounded-2xl shrink-0')} />
        <div className="flex-1 flex flex-col gap-2 pt-1">
          <div className={cn(sk, 'h-3.5 w-3/5')} />
          <div className={cn(sk, 'h-[11px] w-2/5')} />
          <div className={cn(sk, 'h-[11px] w-1/2')} />
        </div>
      </div>
      <div className="grid grid-cols-4 border-t border-zinc-800">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="py-3 flex flex-col items-center gap-1.5">
            <div className={cn(sk, 'h-4 w-[22px]')} />
            <div className={cn(sk, 'h-2.5 w-[52px]')} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 px-[18px] pt-3 pb-4 border-t border-zinc-800">
        <div className={cn(sk, 'flex-1 h-10 rounded-[10px]')} />
        <div className={cn(sk, 'flex-1 h-10 rounded-[10px]')} />
        <div className={cn(sk, 'size-10 rounded-[10px]')} />
      </div>
    </>
  );
}
