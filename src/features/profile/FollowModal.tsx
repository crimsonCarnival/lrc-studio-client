import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { LazyImage } from '@ui/LazyImage';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import { OnlineDot } from '@ui/OnlineDot';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { usePresence } from '@/shared/hooks/usePresence';
import { getFollowList, followUser, unfollowUser } from './profile.service';

interface FollowListUser {
  id: string;
  accountName: string;
  displayName?: string;
  avatarUrl?: string;
  isFollowedByMe?: boolean;
}

interface FollowModalProps {
  accountName: string;
  type: 'FOLLOWERS' | 'FOLLOWING';
  onClose: () => void;
}

export function FollowModal({ accountName, type, onClose }: FollowModalProps) {
  const { t } = useTranslation();
  const { user: me } = useAuthContext();
  const presence = usePresence();
  const [users, setUsers] = useState<FollowListUser[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // Map of accountName → 'following' | 'pending' | 'unfollowing'
  const [followState, setFollowState] = useState<Record<string, string>>({});

  useEffect(() => {
    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setUsers([]);
    setTotal(0);
    setOffset(0);
    setFollowState({});
    getFollowList(accountName, type, 0)
      .then(({ users: initial, total: totalCount }) => {
        if (ignore) return;
        setUsers(initial as FollowListUser[]);
        setTotal(totalCount);
        setOffset(initial.length);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => { ignore = true; };
  }, [accountName, type]);

  const loadMore = () => {
    setLoadingMore(true);
    getFollowList(accountName, type, offset)
      .then(({ users: more }) => {
        setUsers(prev => [...prev, ...(more as FollowListUser[])]);
        setOffset(prev => prev + more.length);
      })
      .finally(() => setLoadingMore(false));
  };

  const handleFollow = useCallback(async (targetAccountName: string) => {
    setFollowState(s => ({ ...s, [targetAccountName]: 'pending' }));
    try {
      await followUser(targetAccountName);
      setFollowState(s => ({ ...s, [targetAccountName]: 'following' }));
      setUsers(prev => prev.map(u =>
        u.accountName === targetAccountName ? { ...u, isFollowedByMe: true } : u
      ));
    } catch {
      setFollowState(s => { const n = { ...s }; delete n[targetAccountName]; return n; });
    }
  }, []);

  const handleUnfollow = useCallback(async (targetAccountName: string) => {
    setFollowState(s => ({ ...s, [targetAccountName]: 'pending' }));
    try {
      await unfollowUser(targetAccountName);
      setFollowState(s => ({ ...s, [targetAccountName]: 'unfollowing' }));
      setUsers(prev => prev.map(u =>
        u.accountName === targetAccountName ? { ...u, isFollowedByMe: false } : u
      ));
    } catch {
      setFollowState(s => { const n = { ...s }; delete n[targetAccountName]; return n; });
    }
  }, []);

  return (
    <>
      <div
        className="fixed inset-0 z-modal-backdrop bg-black/60 backdrop-blur-sm animate-fade-in cursor-default"
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-modal flex items-center justify-center pointer-events-none"
      >
      <div
        className="glass w-full max-w-sm mx-4 rounded-2xl p-6 flex flex-col gap-4 max-h-[75vh] pointer-events-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-base font-semibold text-foreground">
            {type === 'FOLLOWERS' ? t('profile.followersTitle') : t('profile.followingTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="sm" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {type === 'FOLLOWERS' ? t('profile.noFollowers') : t('profile.noFollowing')}
          </p>
        ) : (
          <div className="overflow-y-auto flex flex-col gap-1 -mx-2">
            {users.map(u => {
              const isSelf = me?.accountName === u.accountName;
              const state = followState[u.accountName];
              const isFollowing = state === 'following' ? true : state === 'unfollowing' ? false : u.isFollowedByMe;
              const isPending = state === 'pending';

              return (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5 transition-colors"
                >
                  <Link
                    to={`/${u.accountName}`}
                    onClick={onClose}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="relative size-9 shrink-0">
                      {u.avatarUrl ? (
                        <LazyImage
                          src={u.avatarUrl}
                          alt={u.accountName}
                          className="size-9 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="size-9 rounded-xl bg-gradient-to-br from-primary/80 to-accent-purple flex items-center justify-center font-bold text-zinc-950 text-sm select-none">
                          {(u.displayName || u.accountName)[0].toUpperCase()}
                        </div>
                      )}
                      {presence.isOnline(u.id) && <OnlineDot />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {u.displayName || u.accountName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">@{u.accountName}</p>
                    </div>
                  </Link>

                  {me && !isSelf && (
                    isFollowing ? (
                      <button
                        onClick={() => handleUnfollow(u.accountName)}
                        disabled={isPending}
                        className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
                      >
                        {t('profile.following')}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleFollow(u.accountName)}
                        disabled={isPending}
                        className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors disabled:opacity-50"
                      >
                        {type === 'FOLLOWERS' ? t('profile.followBack') : t('profile.follow')}
                      </button>
                    )
                  )}
                </div>
              );
            })}
            {users.length < total && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="text-sm text-primary hover:underline text-center py-2 disabled:opacity-50"
              >
                {loadingMore ? '...' : t('profile.loadMore')}
              </button>
            )}
          </div>
        )}
      </div>
      </div>
    </>
  );
}
