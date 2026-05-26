import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { LazyImage } from '@ui/LazyImage';
import { getFollowList } from './profile.service';

export function FollowModal({ accountName, type, onClose }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setLoading(true);
    getFollowList(accountName, type, 0)
      .then(({ users: initial, total: t }) => {
        setUsers(initial);
        setTotal(t);
        setOffset(50);
      })
      .finally(() => setLoading(false));
  }, [accountName, type]);

  const loadMore = () => {
    setLoadingMore(true);
    getFollowList(accountName, type, offset)
      .then(({ users: more }) => {
        setUsers(prev => [...prev, ...more]);
        setOffset(prev => prev + 50);
      })
      .finally(() => setLoadingMore(false));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass w-full max-w-sm mx-4 rounded-2xl p-6 flex flex-col gap-4 max-h-[75vh]"
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
            <div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {type === 'FOLLOWERS' ? t('profile.noFollowers') : t('profile.noFollowing')}
          </p>
        ) : (
          <div className="overflow-y-auto flex flex-col gap-1 -mx-2">
            {users.map(u => (
              <Link
                key={u.id}
                to={`/profile/${u.accountName}`}
                onClick={onClose}
                className="flex items-center gap-3 hover:bg-white/5 rounded-xl px-2 py-2 transition-colors"
              >
                {u.avatarUrl ? (
                  <LazyImage
                    src={u.avatarUrl}
                    alt={u.accountName}
                    className="size-9 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="size-9 rounded-xl bg-gradient-to-br from-primary/80 to-accent-purple flex items-center justify-center font-bold text-zinc-950 text-sm shrink-0 select-none">
                    {(u.displayName || u.accountName)[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {u.displayName || u.accountName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">@{u.accountName}</p>
                </div>
              </Link>
            ))}
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
  );
}
