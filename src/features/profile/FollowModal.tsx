import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Icon } from '@/shared/ui/Icon';
import { LazyImage } from '@ui/LazyImage';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import { OnlineDot } from '@ui/OnlineDot';
import { UserHoverCard } from '@ui/UserHoverCard';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { usePresence } from '@/shared/hooks/usePresence';
import { useFollowList, useFollowToggle } from './profile.queries';

type Tab = 'FOLLOWERS' | 'FOLLOWING' | 'FRIENDS';

interface FollowListUser {
  id: string;
  accountName: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  isFollowedByMe?: boolean;
}

interface FollowModalProps {
  accountName: string;
  initialTab?: Tab;
  onClose: () => void;
}

export function FollowModal({ accountName, initialTab = 'FOLLOWERS', onClose }: FollowModalProps) {
  const { t } = useTranslation();
  const { user: me } = useAuthContext();
  const presence = usePresence();
  const isOwnProfile = me?.accountName === accountName;

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  // A tab is fetched the first time it is opened, then served from the cache.
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set([initialTab]));
  const lists = {
    FOLLOWERS: useFollowList(accountName, 'FOLLOWERS', visited.has('FOLLOWERS')),
    FOLLOWING: useFollowList(accountName, 'FOLLOWING', visited.has('FOLLOWING')),
    FRIENDS: useFollowList(accountName, 'FRIENDS', visited.has('FRIENDS')),
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setVisited(prev => (prev.has(tab) ? prev : new Set(prev).add(tab)));
  };

  // The cache holds who is followed; only the in-flight requests are local.
  const followToggle = useFollowToggle();
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const toggleFollow = (targetAccountName: string, follow: boolean) => {
    setPending(prev => new Set(prev).add(targetAccountName));
    followToggle.mutate({ accountName: targetAccountName, follow }, {
      onSettled: () => setPending(prev => {
        const next = new Set(prev);
        next.delete(targetAccountName);
        return next;
      }),
    });
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'FOLLOWERS', label: t('profile.followersTitle') },
    { id: 'FOLLOWING', label: t('profile.followingTitle') },
    { id: 'FRIENDS', label: t('profile.friendsTitle') },
  ];

  const current = lists[activeTab];
  const currentUsers: FollowListUser[] = current.data?.pages.flatMap(page => page.users) ?? [];

  function UserRow({ u }: { u: FollowListUser }) {
    const isSelf = me?.accountName === u.accountName;
    const isFollowing = u.isFollowedByMe;
    const isPending = pending.has(u.accountName);
    const isFriendsTab = activeTab === 'FRIENDS';

    const followBtnLabel = isFollowing
      ? (isFriendsTab ? t('profile.friends') : t('profile.following'))
      : (activeTab === 'FOLLOWERS' && isOwnProfile ? t('profile.followBack') : t('profile.follow'));

    return (
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
        <UserHoverCard accountName={u.accountName} userId={u.id}>
          <Link
            to={`/profile/${u.accountName}`}
            onClick={onClose}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <div className="relative size-9 shrink-0">
              {u.avatarUrl ? (
                <LazyImage src={u.avatarUrl} alt={u.accountName} className="size-9 rounded-xl object-cover" />
              ) : (
                <div className="size-9 rounded-xl bg-gradient-to-br from-primary/80 to-accent-purple flex items-center justify-center font-bold text-zinc-950 text-sm select-none">
                  {(u.displayName || u.accountName)[0].toUpperCase()}
                </div>
              )}
              {presence.isOnline(u.id) && <OnlineDot />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                {u.displayName || u.accountName}
                {isFriendsTab && (
                  <Icon name="favorite" size={12} filled className="text-primary/60 shrink-0" />
                )}
              </p>
              <p className="text-xs text-muted-foreground truncate">{u.accountName}</p>
            </div>
          </Link>
        </UserHoverCard>

        {me && !isSelf && (
          isFollowing ? (
            <button
              onClick={() => toggleFollow(u.accountName, false)}
              disabled={isPending}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {followBtnLabel}
            </button>
          ) : (
            <button
              onClick={() => toggleFollow(u.accountName, true)}
              disabled={isPending}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {followBtnLabel}
            </button>
          )
        )}
      </div>
    );
  }

  // Portaled to document.body. Rendered inline (the previous behavior), this
  // `fixed inset-0` wrapper centered against some ancestor's box instead of
  // the viewport — the modal opened ~300px below true center and could run
  // off the bottom of the screen. Every other modal in the app (Dialog,
  // ProjectSetupModal, …) is already portaled; this one wasn't.
  return createPortal(
    <>
      <div
        className="fixed inset-0 z-modal-backdrop bg-black/60 backdrop-blur-sm animate-fade-in cursor-default"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-modal flex items-center justify-center pointer-events-none p-4">
        <div
          className="glass w-full max-w-sm rounded-2xl flex flex-col pointer-events-auto"
          style={{ height: 520 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
            <p className="text-sm font-semibold text-foreground">
              <span className="text-muted-foreground">@</span>{accountName}
            </p>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1">
              <Icon name="close" size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 pb-0 shrink-0 border-b border-border/40">
            {TABS.map(tab => {
              const count = lists[tab.id].data?.pages[0]?.total ?? null;
              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 coarse:py-3.5 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {tab.label}
                  {count !== null && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-primary/15 text-primary' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* List */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {current.isPending ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner size="sm" />
              </div>
            ) : current.isSuccess && currentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                {activeTab === 'FOLLOWERS' ? t('profile.noFollowers')
                  : activeTab === 'FOLLOWING' ? t('profile.noFollowing')
                    : t('profile.noFriends')}
              </p>
            ) : (
              <div className="py-1">
                {currentUsers.map(u => <UserRow key={u.id} u={u} />)}

                {current.hasNextPage && (
                  <div className="flex justify-center py-3">
                    <button
                      onClick={() => current.fetchNextPage()}
                      disabled={current.isFetchingNextPage}
                      className="text-sm text-primary hover:underline disabled:opacity-50"
                    >
                      {current.isFetchingNextPage ? <LoadingSpinner size="sm" /> : t('profile.loadMore')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
