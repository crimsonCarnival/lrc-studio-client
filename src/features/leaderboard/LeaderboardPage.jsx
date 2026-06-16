import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Trophy, Timer, Music2, Star, GitFork, Loader2, ChevronDown, Flame, Music } from 'lucide-react';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import { LazyImage } from '@ui/LazyImage';
import { Button } from '@ui/button';
import { BadgeList } from '@/features/badges/BadgeList';
import { Tip } from '@ui/tip';
import { getLeaderboard } from './leaderboard.service';

function formatMinutes(min) {
  if (!min || min <= 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatCount(n) {
  if (!n || n <= 0) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const PODIUM = {
  1: { accent: 'border-l-warning', medal: '🥇', glow: 'bg-warning/8', ring: 'ring-1 ring-warning/30', label: 'text-warning' },
  2: { accent: 'border-l-zinc-400', medal: '🥈', glow: 'bg-zinc-400/5', ring: 'ring-1 ring-zinc-400/20', label: 'text-zinc-300' },
  3: { accent: 'border-l-orange-500', medal: '🥉', glow: 'bg-orange-500/5', ring: 'ring-1 ring-orange-500/20', label: 'text-orange-400' },
};

function StatChip({ icon: Icon, value, tooltip, color = 'text-zinc-500' }) {
  return (
    <Tip content={tooltip} side="top">
      <div className="flex items-center gap-1">
        <Icon className={`size-3 shrink-0 ${color}`} />
        <span className={`text-[11px] tabular-nums font-medium ${color}`}>{value}</span>
      </div>
    </Tip>
  );
}

function RankBadge({ pos }) {
  const p = PODIUM[pos];
  if (p) {
    return (
      <span className="text-base leading-none w-7 text-center select-none" aria-label={`Rank ${pos}`}>
        {p.medal}
      </span>
    );
  }
  return (
    <span className="text-xs tabular-nums w-7 text-center text-zinc-600 font-mono font-semibold" aria-label={`Rank ${pos}`}>
      {pos}
    </span>
  );
}

function UserAvatar({ avatarUrl, name, ring }) {
  if (avatarUrl) {
    return (
      <LazyImage
        src={avatarUrl}
        alt={name}
        className={`size-9 rounded-xl object-cover flex-shrink-0 ${ring ?? ''}`}
      />
    );
  }
  return (
    <div className={`size-9 rounded-xl bg-gradient-to-br from-primary/70 to-accent-blue flex items-center justify-center flex-shrink-0 font-bold text-zinc-950 text-sm select-none ${ring ?? ''}`}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

function LeaderboardRow({ entry, rank }) {
  const { t } = useTranslation();
  const p = PODIUM[rank];
  const name = entry.displayName || entry.accountName;
  const badgeIds = (entry.badges ?? []).map(b => b.id);

  return (
    <Link
      to={`/${entry.accountName}`}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150
        ${p
          ? `border-l-2 ${p.accent} border-t border-r border-b border-zinc-700/30 ${p.glow} hover:border-zinc-600/40`
          : 'border border-zinc-800/50 bg-zinc-800/20 hover:bg-zinc-800/50 hover:border-zinc-700/40'
        }`}
    >
      {/* Rank */}
      <RankBadge pos={rank} />

      {/* Avatar */}
      <UserAvatar avatarUrl={entry.avatarUrl} name={name} ring={p?.ring} />

      {/* Identity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-sm font-semibold truncate transition-colors group-hover:text-primary ${p ? p.label : 'text-zinc-200'}`}>
            {name}
          </span>
          {(entry.progression?.level ?? 0) > 0 && (
            <span className="text-[9px] font-bold text-zinc-600 border border-zinc-800 px-1 py-0.5 rounded tabular-nums shrink-0">
              Lv.{entry.progression.level}
            </span>
          )}
          {badgeIds.length > 0 && <BadgeList ids={badgeIds} max={2} />}
        </div>
        <span className="text-[11px] text-zinc-600 font-mono">@{entry.accountName}</span>
      </div>

      {/* Inline stats — icon+value chips, no text labels = no locale overflow */}
      <div className="flex items-center gap-3 shrink-0">
        {(entry.streak?.current ?? 0) > 0 && (
          <Tip content={t('badges.leaderboard.streak')} side="top">
            <div className="hidden lg:flex items-center gap-1">
              <Flame className="size-3 text-orange-500/70" />
              <span className="text-[11px] tabular-nums font-medium text-orange-500/70">{entry.streak.current}d</span>
            </div>
          </Tip>
        )}

        <div className="hidden sm:flex items-center gap-3">
          <StatChip
            icon={Music2}
            value={formatCount(entry.stats?.karaokeLines ?? 0)}
            tooltip={t('badges.leaderboard.syncedLines')}
            color="text-zinc-500"
          />
          <StatChip
            icon={Star}
            value={formatCount(entry.totalStarsReceived ?? 0)}
            tooltip={t('badges.leaderboard.stars')}
            color="text-zinc-500"
          />
          <StatChip
            icon={GitFork}
            value={formatCount(entry.totalForksReceived ?? 0)}
            tooltip={t('badges.leaderboard.forks')}
            color="text-zinc-500"
          />
          <StatChip
            icon={Music}
            value={formatCount(entry.projectCount ?? 0)}
            tooltip={t('badges.leaderboard.projects')}
            color="text-zinc-500"
          />
        </div>

        {/* Primary metric — always visible */}
        <Tip content={t('badges.leaderboard.musicSynced')} side="top">
          <div className="flex items-center gap-1.5 min-w-[52px] justify-end">
            <Timer className="size-3.5 text-accent-blue shrink-0" />
            <span className={`font-semibold tabular-nums text-sm ${p ? p.label : 'text-zinc-300'}`}>
              {formatMinutes(entry.stats?.minutesSynced ?? 0)}
            </span>
          </div>
        </Tip>
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

      {/* Header card */}
      <div className="glass rounded-[2rem] p-6 sm:p-8 mb-4 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 size-48 rounded-full bg-warning/5 blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute -bottom-12 -left-12 size-36 rounded-full bg-primary/5 blur-3xl pointer-events-none" aria-hidden />

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

        {/* Stats legend — icons only, no translated column headers */}
        {!loading && !error && users.length > 0 && (
          <div className="hidden sm:flex items-center justify-end gap-3 mt-5 pt-4 border-t border-zinc-800/40">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mr-auto">
              {t('badges.leaderboard.user')}
            </span>
            <Tip content={t('badges.leaderboard.syncedLines')} side="top">
              <Music2 className="size-3.5 text-zinc-600" />
            </Tip>
            <Tip content={t('badges.leaderboard.stars')} side="top">
              <Star className="size-3.5 text-zinc-600" />
            </Tip>
            <Tip content={t('badges.leaderboard.forks')} side="top">
              <GitFork className="size-3.5 text-zinc-600" />
            </Tip>
            <Tip content={t('badges.leaderboard.projects')} side="top">
              <Music className="size-3.5 text-zinc-600" />
            </Tip>
            <div className="w-px h-3 bg-zinc-700/60 mx-1" />
            <Tip content={t('badges.leaderboard.musicSynced')} side="top">
              <Timer className="size-3.5 text-zinc-600" />
            </Tip>
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
          <p className="text-sm font-medium text-muted-foreground">{t('badges.leaderboard.error')}</p>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Timer className="size-10 text-zinc-700" />
          <p className="text-sm text-muted-foreground">{t('badges.leaderboard.empty')}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
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
                {loadingMore ? <Loader2 className="size-3.5 animate-spin" /> : <ChevronDown className="size-3.5" />}
                {t('common.loadMore')}
              </Button>
            </div>
          )}

          <p className="text-center text-[10px] text-zinc-700 mt-6">
            {t('badges.leaderboard.subtitle')}
          </p>
        </>
      )}
    </div>
  );
}
