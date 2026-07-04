import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { useSuggestedUsers } from '../hooks/useExplore';
import { followUser, unfollowUser } from '@/features/profile/profile.service';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { UserHoverCard } from '@ui/UserHoverCard';

interface SuggestedUser {
  id: string;
  accountName: string;
  displayName?: string;
  avatarUrl?: string;
  isFollowedByMe?: boolean;
}

export function SuggestedUsers({ limit = 8 }: { limit?: number }) {
  const { t } = useTranslation();
  const { user: me } = useAuthContext();
  const { users, loading, error } = useSuggestedUsers(limit) as {
    users: SuggestedUser[];
    loading: boolean;
    error: unknown;
  };
  const [followState, setFollowState] = useState<Record<string, string>>({});

  const handleFollow = useCallback(async (accountName: string) => {
    setFollowState(s => ({ ...s, [accountName]: 'pending' }));
    try {
      await followUser(accountName);
      setFollowState(s => ({ ...s, [accountName]: 'following' }));
    } catch {
      setFollowState(s => { const n = { ...s }; delete n[accountName]; return n; });
    }
  }, []);

  const handleUnfollow = useCallback(async (accountName: string) => {
    setFollowState(s => ({ ...s, [accountName]: 'pending' }));
    try {
      await unfollowUser(accountName);
      setFollowState(s => { const n = { ...s }; delete n[accountName]; return n; });
    } catch {
      setFollowState(s => { const n = { ...s }; delete n[accountName]; return n; });
    }
  }, []);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-white">{t('explore.suggested.title')}</h2>

      {loading ? (
        <div className="flex justify-center py-10">
          <Icon name="progress_activity" size={24} className="animate-spin text-zinc-500" />
        </div>
      ) : error || users.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-10">
          {t('explore.suggested.empty')}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {users.map(u => {
            const isSelf = me?.accountName === u.accountName;
            const state = followState[u.accountName];
            const isFollowing = state === 'following' ? true : state === undefined ? u.isFollowedByMe : false;
            const isPending = state === 'pending';

            return (
              <div
                key={u.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700/70 transition-colors"
              >
                <UserHoverCard accountName={u.accountName} userId={u.id}>
                  <Link to={`/${u.accountName}`} className="flex items-center gap-3 flex-1 min-w-0">
                    {u.avatarUrl ? (
                      <img
                        src={u.avatarUrl}
                        alt={u.displayName || u.accountName}
                        referrerPolicy="no-referrer"
                        className="size-9 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="size-9 rounded-full bg-gradient-to-br from-primary/50 to-violet-500/50 flex items-center justify-center text-sm font-bold text-white shrink-0 select-none">
                        {(u.displayName || u.accountName || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {u.displayName || u.accountName}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">@{u.accountName}</p>
                    </div>
                  </Link>
                </UserHoverCard>

                {me && !isSelf && (
                  isFollowing ? (
                    <button
                      onClick={() => handleUnfollow(u.accountName)}
                      disabled={isPending}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-50"
                    >
                      {t('explore.suggested.following')}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleFollow(u.accountName)}
                      disabled={isPending}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors disabled:opacity-50"
                    >
                      {t('explore.suggested.follow')}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
