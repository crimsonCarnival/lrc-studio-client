import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Music2, BadgeCheck, Star, FolderOpen, Users, Trophy } from 'lucide-react';
import { BadgeChip } from '@/features/badges/BadgeChip';
import { LazyImage } from '@ui/LazyImage';
import { OnlineDot } from '@ui/OnlineDot';
import { usePresence } from '@/shared/hooks/usePresence';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { followUser, unfollowUser } from '@/features/profile/profile.service';
import { gqlRequest } from '@/app/graphql.client';

interface MiniProfile {
  id: string;
  accountName: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  followerCount: number;
  followingCount: number;
  projectCount: number;
  totalStarsReceived: number;
  isFollowedByMe: boolean;
  isFollowingMe: boolean;
  progression: { xp: number; level: number } | null;
  miniProfileBadgeIds: string[];
}

const profileCache = new Map<string, MiniProfile>();

async function fetchMiniProfile(accountName: string): Promise<MiniProfile | null> {
  if (profileCache.has(accountName)) return profileCache.get(accountName)!;
  try {
    const data = await gqlRequest<{ publicProfile: MiniProfile | null }>(/* GraphQL */ `
      query MiniProfile($accountName: String!) {
        publicProfile(accountName: $accountName) {
          id accountName displayName avatarUrl bio isVerified
          followerCount followingCount projectCount totalStarsReceived
          isFollowedByMe isFollowingMe miniProfileBadgeIds
          progression { xp level }
        }
      }
    `, { accountName });
    if (data.publicProfile) profileCache.set(accountName, data.publicProfile);
    return data.publicProfile;
  } catch {
    return null;
  }
}

interface UserHoverCardProps {
  accountName: string;
  userId?: string;
  children: ReactNode;
}

const OPEN_DELAY = 280;
const CLOSE_DELAY = 120;

export function UserHoverCard({ accountName, userId, children }: UserHoverCardProps) {
  const { t } = useTranslation();
  const { user: me } = useAuthContext();
  const presence = usePresence();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  // Shared timer used for both open-delay and close-delay
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });
  const [profile, setProfile] = useState<MiniProfile | null>(() => profileCache.get(accountName) ?? null);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [followPending, setFollowPending] = useState(false);

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
    timerRef.current = setTimeout(async () => {
      setOpen(true);
      if (!profileCache.has(accountName)) {
        const p = await fetchMiniProfile(accountName);
        if (p) { setProfile(p); setFollowing(p.isFollowedByMe); }
      } else {
        const p = profileCache.get(accountName)!;
        setProfile(p); setFollowing(p.isFollowedByMe);
      }
    }, OPEN_DELAY);
  }, [accountName, clearTimer]);

  const startClose = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
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
    profileCache.delete(accountName);
    try {
      if (nowFollowing) await followUser(accountName);
      else await unfollowUser(accountName);
    } catch {
      setFollowing(!nowFollowing);
    } finally {
      setFollowPending(false);
    }
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
          style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999, width: 332, visibility: pos.top === -9999 ? 'hidden' : 'visible' }}
          className="bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl shadow-black/70 flex flex-col overflow-hidden animate-fade-in"
        >
          {/* Avatar banner */}
          <div className="flex items-end gap-3 p-4 pb-3">
            <Link to={`/${accountName}`} onClick={() => setOpen(false)} className="relative shrink-0">
              {profile?.avatarUrl ? (
                <LazyImage src={profile.avatarUrl} alt={accountName} className="size-14 rounded-xl object-cover ring-2 ring-zinc-700" />
              ) : (
                <div className="size-14 rounded-xl bg-gradient-to-br from-primary/80 to-violet-500/50 flex items-center justify-center font-bold text-xl text-zinc-950 select-none ring-2 ring-zinc-700">
                  {(profile?.displayName || accountName)[0]?.toUpperCase()}
                </div>
              )}
              {isOnline && <OnlineDot />}
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <Link to={`/${accountName}`} onClick={() => setOpen(false)} className="text-sm font-semibold text-foreground hover:underline leading-tight truncate max-w-[130px]">
                  {profile?.displayName || accountName}
                </Link>
                {profile?.isVerified && <BadgeCheck className="size-3.5 text-primary shrink-0" />}
                {isFollowingMe && !isFollowedByMe && (
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-zinc-700/60 text-zinc-400 px-1.5 py-0.5 rounded">
                    {t('profile.followsYou')}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">@{accountName}</p>
            </div>

            {me && !isSelf && (
              <button
                onClick={handleFollowToggle}
                disabled={followPending}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50 whitespace-nowrap ${
                  isFollowedByMe
                    ? 'border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {followLabel}
              </button>
            )}
          </div>

          {/* Activity */}
          {activity && (
            <div className="mx-4 mb-3 flex items-center gap-1.5 text-xs text-primary/80 bg-primary/8 rounded-lg px-2.5 py-1.5">
              <Music2 className="size-3 shrink-0 animate-pulse" />
              <span className="truncate">{t('profile.syncingActivity', { song: activity.songName || activity.projectTitle })}</span>
            </div>
          )}

          {/* Bio */}
          {profile?.bio && (
            <p className="mx-4 mb-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{profile.bio}</p>
          )}

          {/* Stats grid */}
          {profile && (
            <div className="border-t border-border/40 grid grid-cols-5 divide-x divide-border/30">
              {[
                { icon: Users,     value: profile.followerCount,      label: t('profile.followers') },
                { icon: Users,     value: profile.followingCount,      label: t('profile.followingLabel') },
                { icon: FolderOpen,value: profile.projectCount,        label: t('profile.projectsLabel') },
                { icon: Star,      value: profile.totalStarsReceived,  label: t('profile.starsLabel') },
                { icon: Trophy,    value: profile.progression?.level ?? 0, label: t('profile.levelLabel') },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex flex-col items-center py-2.5 px-0.5 gap-0.5">
                  <Icon className="size-3 text-zinc-500 mb-0.5" />
                  <span className="text-xs font-bold text-foreground">{value}</span>
                  <span className="text-[8px] text-muted-foreground leading-none text-center">{label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Mini profile badges */}
          {profile && profile.miniProfileBadgeIds.length > 0 && (
            <div className="border-t border-border/30 px-4 py-2.5 flex items-center gap-1.5 flex-wrap">
              {profile.miniProfileBadgeIds.map(id => (
                <BadgeChip key={id} id={id} />
              ))}
            </div>
          )}

        </div>,
        document.body
      )}
    </>
  );
}
