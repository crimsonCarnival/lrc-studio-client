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
          to={`/profile/${accountName}`}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent rounded-lg transition-colors"
        >
          <div className="size-7 rounded-full overflow-hidden bg-zinc-800 shrink-0">
            {avatarUrl
              ? <LazyImage src={avatarUrl} alt={displayName || accountName} className="size-full object-cover" />
              : <div className="size-full flex items-center justify-center text-xs font-bold text-zinc-400">{initials}</div>}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{displayName || accountName}</p>
            {displayName && <p className="text-xs text-muted-foreground truncate">{accountName}</p>}
          </div>
        </Link>
      </UserHoverCard>
    );
  }

  return (
    <UserHoverCard accountName={accountName} userId={id}>
      <Link
        to={`/profile/${accountName}`}
        className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-border/80 hover:bg-accent/50 transition-all"
      >
        <div className="size-10 rounded-full overflow-hidden bg-zinc-800 shrink-0">
          {avatarUrl
            ? <LazyImage src={avatarUrl} alt={displayName || accountName} className="size-full object-cover" />
            : <div className="size-full flex items-center justify-center text-sm font-bold text-zinc-400">{initials}</div>}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{displayName || accountName}</p>
          <p className="text-xs text-muted-foreground truncate">{accountName}</p>
        </div>
      </Link>
    </UserHoverCard>
  );
}
