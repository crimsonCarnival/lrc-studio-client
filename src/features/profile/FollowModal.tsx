import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Icon } from '@/shared/ui/Icon';
import { LazyImage } from '@ui/LazyImage';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import { OnlineDot } from '@ui/OnlineDot';
import { UserHoverCard } from '@ui/UserHoverCard';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { usePresence } from '@/shared/hooks/usePresence';
import { getFollowList, followUser, unfollowUser } from './profile.service';

type Tab = 'FOLLOWERS' | 'FOLLOWING' | 'FRIENDS';

interface FollowListUser {
  id: string;
  accountName: string;
  displayName?: string;
  avatarUrl?: string;
  isFollowedByMe?: boolean;
}

interface TabState {
  users: FollowListUser[];
  total: number;
  offset: number;
  loading: boolean;
  loaded: boolean;
  loadingMore: boolean;
}

const INITIAL_TAB_STATE: TabState = {
  users: [], total: 0, offset: 0,
  loading: false, loaded: false, loadingMore: false,
};

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
  const [tabStates, setTabStates] = useState<Record<Tab, TabState>>({
    FOLLOWERS: { ...INITIAL_TAB_STATE },
    FOLLOWING: { ...INITIAL_TAB_STATE },
    FRIENDS:   { ...INITIAL_TAB_STATE },
  });
  const [followState, setFollowState] = useState<Record<string, string>>({});

  const updateTab = useCallback((tab: Tab, patch: Partial<TabState>) => {
    setTabStates(prev => ({ ...prev, [tab]: { ...prev[tab], ...patch } }));
  }, []);

  const loadTab = useCallback(async (tab: Tab, offset = 0) => {
    if (offset === 0) {
      updateTab(tab, { loading: true, users: [], total: 0, offset: 0 });
    } else {
      updateTab(tab, { loadingMore: true });
    }
    try {
      const { users, total } = await getFollowList(accountName, tab, offset) as { users: FollowListUser[]; total: number };
      setTabStates(prev => ({
        ...prev,
        [tab]: {
          ...prev[tab],
          users: offset === 0 ? users : [...prev[tab].users, ...users],
          total,
          offset: offset + users.length,
          loaded: true,
          loading: false,
          loadingMore: false,
        },
      }));
    } catch {
      updateTab(tab, { loading: false, loadingMore: false });
    }
  }, [accountName, updateTab]);

  // Load initial tab
  const loadedRef = useRef<Set<Tab>>(new Set());
  useEffect(() => {
    if (!loadedRef.current.has(activeTab)) {
      loadedRef.current.add(activeTab);
      loadTab(activeTab);
    }
  }, [activeTab, loadTab]);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    if (!loadedRef.current.has(tab)) {
      loadedRef.current.add(tab);
      loadTab(tab);
    }
  };

  const handleFollow = useCallback(async (targetAccountName: string) => {
    setFollowState(s => ({ ...s, [targetAccountName]: 'pending' }));
    try {
      await followUser(targetAccountName);
      setFollowState(s => ({ ...s, [targetAccountName]: 'following' }));
      setTabStates(prev => {
        const updated = { ...prev };
        for (const tab of ['FOLLOWERS', 'FOLLOWING', 'FRIENDS'] as Tab[]) {
          updated[tab] = {
            ...updated[tab],
            users: updated[tab].users.map(u =>
              u.accountName === targetAccountName ? { ...u, isFollowedByMe: true } : u
            ),
          };
        }
        return updated;
      });
    } catch {
      setFollowState(s => { const n = { ...s }; delete n[targetAccountName]; return n; });
    }
  }, []);

  const handleUnfollow = useCallback(async (targetAccountName: string) => {
    setFollowState(s => ({ ...s, [targetAccountName]: 'pending' }));
    try {
      await unfollowUser(targetAccountName);
      setFollowState(s => ({ ...s, [targetAccountName]: 'unfollowing' }));
      setTabStates(prev => {
        const updated = { ...prev };
        for (const tab of ['FOLLOWERS', 'FOLLOWING', 'FRIENDS'] as Tab[]) {
          updated[tab] = {
            ...updated[tab],
            users: updated[tab].users.map(u =>
              u.accountName === targetAccountName ? { ...u, isFollowedByMe: false } : u
            ),
          };
        }
        return updated;
      });
    } catch {
      setFollowState(s => { const n = { ...s }; delete n[targetAccountName]; return n; });
    }
  }, []);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'FOLLOWERS', label: t('profile.followersTitle') },
    { id: 'FOLLOWING', label: t('profile.followingTitle') },
    { id: 'FRIENDS',   label: t('profile.friendsTitle') },
  ];

  const current = tabStates[activeTab];

  function UserRow({ u }: { u: FollowListUser }) {
    const isSelf = me?.accountName === u.accountName;
    const state = followState[u.accountName];
    const isFollowing = state === 'following' ? true : state === 'unfollowing' ? false : u.isFollowedByMe;
    const isPending = state === 'pending';
    const isFriendsTab = activeTab === 'FRIENDS';

    const followBtnLabel = isFollowing
      ? (isFriendsTab ? t('profile.friends') : t('profile.following'))
      : (activeTab === 'FOLLOWERS' && isOwnProfile ? t('profile.followBack') : t('profile.follow'));

    return (
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
        <UserHoverCard accountName={u.accountName} userId={u.id}>
          <Link
            to={`/${u.accountName}`}
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
                  <Icon name="favorite" size={12} className="text-primary/60 shrink-0" />
                )}
              </p>
              <p className="text-xs text-muted-foreground truncate">@{u.accountName}</p>
            </div>
          </Link>
        </UserHoverCard>

        {me && !isSelf && (
          isFollowing ? (
            <button
              onClick={() => handleUnfollow(u.accountName)}
              disabled={isPending}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {followBtnLabel}
            </button>
          ) : (
            <button
              onClick={() => handleFollow(u.accountName)}
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

  return (
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
              const count = tabStates[tab.id].loaded ? tabStates[tab.id].total : null;
              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                  {count !== null && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.id ? 'bg-primary/15 text-primary' : 'bg-zinc-800 text-zinc-500'
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
            {current.loading ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner size="sm" />
              </div>
            ) : current.loaded && current.users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                {activeTab === 'FOLLOWERS' ? t('profile.noFollowers')
                  : activeTab === 'FOLLOWING' ? t('profile.noFollowing')
                  : t('profile.noFriends')}
              </p>
            ) : (
              <div className="py-1">
                {current.users.map(u => <UserRow key={u.id} u={u} />)}

                {current.users.length < current.total && (
                  <div className="flex justify-center py-3">
                    <button
                      onClick={() => loadTab(activeTab, current.offset)}
                      disabled={current.loadingMore}
                      className="text-sm text-primary hover:underline disabled:opacity-50"
                    >
                      {current.loadingMore ? <LoadingSpinner size="sm" /> : t('profile.loadMore')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
