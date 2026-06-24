import { Link } from 'react-router-dom';
import { LazyImage } from '@ui/LazyImage';
import { UserHoverCard } from '@ui/UserHoverCard';
import type { FollowUser } from '@/types';

export function SearchUserCard({ user, compact = false }: { user: FollowUser; compact?: boolean }) {
  const { accountName, displayName, avatarUrl, id } = user;
  const initials = (displayName || accountName || '?').charAt(0).toUpperCase();

  if (compact) {
    return (
      <UserHoverCard accountName={accountName} userId={id}>
        <Link
          to={`/${accountName}`}
          className="flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800/60 rounded-lg transition-colors"
        >
          <div className="size-7 rounded-full overflow-hidden bg-zinc-800 shrink-0">
            {avatarUrl
              ? <LazyImage src={avatarUrl} alt={displayName || accountName} className="size-full object-cover" />
              : <div className="size-full flex items-center justify-center text-xs font-bold text-zinc-400">{initials}</div>}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{displayName || accountName}</p>
            {displayName && <p className="text-xs text-zinc-500 truncate">@{accountName}</p>}
          </div>
        </Link>
      </UserHoverCard>
    );
  }

  return (
    <UserHoverCard accountName={accountName} userId={id}>
      <Link
        to={`/${accountName}`}
        className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700/70 hover:bg-zinc-800/50 transition-all"
      >
        <div className="size-10 rounded-full overflow-hidden bg-zinc-800 shrink-0">
          {avatarUrl
            ? <LazyImage src={avatarUrl} alt={displayName || accountName} className="size-full object-cover" />
            : <div className="size-full flex items-center justify-center text-sm font-bold text-zinc-400">{initials}</div>}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-white text-sm truncate">{displayName || accountName}</p>
          <p className="text-xs text-zinc-400 truncate">@{accountName}</p>
        </div>
      </Link>
    </UserHoverCard>
  );
}
