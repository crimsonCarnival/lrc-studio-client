import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Trophy, Timer, Music, Star, Loader2, ChevronDown, Flame, Zap } from 'lucide-react';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import { LazyImage } from '@ui/LazyImage';
import { Button } from '@ui/button';
import { BadgeList } from '@/features/badges/BadgeList';
import { getLeaderboard } from './leaderboard.service';

function formatMinutes(min) {
  if (!min || min <= 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const RANK_STYLES = {
  1: {
    border:  'border-l-2 border-l-warning',
    rank:    'text-warning',
    ring:    'ring-2 ring-warning/50',
    medal:   '🥇',
  },
  2: {
    border:  'border-l-2 border-l-zinc-400',
    rank:    'text-zinc-300',
    ring:    'ring-2 ring-zinc-400/40',
    medal:   '🥈',
  },
  3: {
    border:  'border-l-2 border-l-orange-600',
    rank:    'text-orange-400',
    ring:    'ring-2 ring-orange-600/40',
    medal:   '🥉',
  },
};

function RankNumber({ pos }) {
  const s = RANK_STYLES[pos];
  if (s) {
    return (
      <span
        className={`text-lg font-bold font-heading tabular-nums w-8 text-center ${s.rank}`}
        aria-label={`Rank ${pos}`}
      >
        {s.medal}
      </span>
    );
  }
  return (
    <span className="text-sm tabular-nums w-8 text-center text-zinc-500 font-mono">
      {pos}
    </span>
  );
}

function UserAvatar({ avatarUrl, name, rankStyle }) {
  const ringCls = rankStyle?.ring ?? '';
  if (avatarUrl) {
    return (
      <LazyImage
        src={avatarUrl}
        alt={name}
        className={`size-10 rounded-xl object-cover flex-shrink-0 ${ringCls}`}
      />
    );
  }
  return (
    <div
      className={`size-10 rounded-xl bg-gradient-to-br from-primary/80 to-accent-blue flex items-center justify-center flex-shrink-0 font-bold text-zinc-950 text-sm select-none ${ringCls}`}
    >
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

function LeaderboardRow({ entry, rank }) {
  const rs = RANK_STYLES[rank];
  const badgeIds = (entry.badges ?? []).map(b => b.id);

  return (
    <Link
      to={`/${entry.accountName}`}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-700/40 hover:border-zinc-600/50 transition-all duration-150 group ${rs ? rs.border : ''}`}
    >
      <RankNumber pos={rank} />

      <UserAvatar
        avatarUrl={entry.avatarUrl}
        name={entry.displayName || entry.accountName}
        rankStyle={rs}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-zinc-100 group-hover:text-primary transition-colors truncate">
            {entry.displayName || entry.accountName}
          </span>
          {entry.level > 0 && (
            <span className="text-[9px] font-bold text-zinc-600 border border-zinc-800 px-1 py-0.5 rounded tabular-nums">
              Lv.{entry.level}
            </span>
          )}
          {badgeIds.length > 0 && <BadgeList ids={badgeIds} max={2} />}
        </div>
        <span className="text-xs text-zinc-500 font-mono">@{entry.accountName}</span>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 text-right">
        {entry.currentStreak > 0 && (
          <div className="hidden lg:flex items-center gap-1 text-xs text-orange-500/80">
            <Flame className="size-3" />
            <span className="tabular-nums">{entry.currentStreak}d</span>
          </div>
        )}
        <div className="hidden sm:flex items-center gap-1 text-xs text-zinc-500">
          <Music className="size-3" />
          <span className="tabular-nums">{(entry.projectCount ?? 0).toLocaleString()}</span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-xs text-zinc-500">
          <Star className="size-3" />
          <span className="tabular-nums">{(entry.totalStarsReceived ?? 0).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Timer className="size-3.5 text-accent-blue" />
          <span className={`font-semibold tabular-nums text-sm ${rs ? rs.rank : 'text-zinc-200'}`}>
            {formatMinutes(entry.minutesSynced ?? 0)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function LeaderboardPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);

  const PAGE_SIZE = 25;

  useEffect(() => {
    setLoading(true);
    getLeaderboard(PAGE_SIZE, 0)
      .then(data => {
        setUsers(data.users);
        setHasMore(data.hasMore);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const loadMore = () => {
    setLoadingMore(true);
    getLeaderboard(PAGE_SIZE, users.length)
      .then(data => {
        setUsers(prev => [...prev, ...data.users]);
        setHasMore(data.hasMore);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  return (
    <div className="flex-1 flex flex-col px-4 pt-6 pb-16 max-w-3xl mx-auto w-full animate-fade-in">
      {/* Header */}
      <div className="glass rounded-[2rem] p-6 sm:p-8 mb-6 relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute -top-16 -right-16 size-48 rounded-full bg-warning/5 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-12 -left-12 size-36 rounded-full bg-primary/5 blur-3xl pointer-events-none" aria-hidden="true" />

        <div className="relative flex items-start gap-4">
          <div className="size-12 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center flex-shrink-0">
            <Trophy className="size-6 text-warning" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-semibold text-foreground">
              {t('badges.leaderboard.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {t('badges.leaderboard.subtitle')}
            </p>
          </div>
        </div>

        {/* Column headers */}
        {!loading && !error && users.length > 0 && (
          <div className="flex items-center gap-3 mt-6 px-4 text-[10.5px] font-semibold uppercase tracking-widest text-zinc-500">
            <span className="w-8 text-center">#</span>
            <span className="size-10 flex-shrink-0" />
            <span className="flex-1">{t('badges.leaderboard.user')}</span>
            <div className="flex items-center gap-4 flex-shrink-0">
              <span className="hidden sm:block w-10 text-right">{t('badges.leaderboard.projects')}</span>
              <span className="hidden sm:block w-8 text-right">{t('badges.leaderboard.stars')}</span>
              <span className="w-16 text-right">{t('badges.leaderboard.synced')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="md" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {t('badges.leaderboard.error')}
          </p>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
          <Timer className="size-10 text-zinc-600" />
          <p className="text-sm text-muted-foreground">
            {t('badges.leaderboard.empty')}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {users.map((entry, i) => (
              <LeaderboardRow key={entry.id ?? entry.accountName} entry={entry} rank={i + 1} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
                className="gap-1.5"
              >
                {loadingMore ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
                {t('common.loadMore')}
              </Button>
            </div>
          )}

          <p className="text-center text-[10.5px] text-zinc-600 mt-6">
            {t('badges.leaderboard.subtitle')}
          </p>
        </>
      )}
    </div>
  );
}
