import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/shared/ui/Icon';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import { LazyImage } from '@ui/LazyImage';
import { Button } from '@ui/button';
import { getLeaderboard } from './leaderboard.service';

interface LeaderEntry {
  id?: string;
  accountName: string;
  displayName?: string;
  avatarUrl?: string;
  badges?: { id: string }[];
  progression?: { level?: number };
  streak?: { current?: number };
  stats?: { karaokeLines?: number; minutesSynced?: number; secondsSynced?: number; syncedLines?: number; aiSyncedLines?: number; wordsSynced?: number; aiWordsSynced?: number };
  totalStarsReceived?: number;
  totalForksReceived?: number;
  projectCount?: number;
  rankScore?: number;
}

interface PodiumStyle {
  accent: string;
  medal: string;
  glow: string;
  ring: string;
  label: string;
}

function formatTime(min?: number, sec?: number) {
  const m = min ?? 0;
  const s = sec ?? 0;
  if (m <= 0 && s <= 0) return '—';

  const totalSeconds = m * 60 + s;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    if (minutes === 0) return `${hours} h`;
    return `${hours} h ${minutes} m`;
  }
  if (minutes > 0) {
    if (seconds === 0) return `${minutes} m`;
    return `${minutes} m ${seconds} s`;
  }
  return `${seconds} s`;
}

function formatCount(n?: number) {
  if (!n || n <= 0) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const PODIUM: Record<number, PodiumStyle> = {
  1: { accent: 'text-warning', medal: 'emoji_events', glow: 'bg-warning/10', ring: 'ring-2 ring-warning', label: 'text-warning' },
  2: { accent: 'text-zinc-300', medal: 'emoji_events', glow: 'bg-zinc-300/10', ring: 'ring-2 ring-zinc-300', label: 'text-zinc-200' },
  3: { accent: 'text-orange-500', medal: 'emoji_events', glow: 'bg-orange-500/10', ring: 'ring-2 ring-orange-500', label: 'text-orange-400' },
};

function RankBadge({ pos }: { pos: number }) {
  const { t } = useTranslation();
  const p = PODIUM[pos];
  if (p) {
    return (
      <div className="flex items-center justify-center">
        <Icon name={p.medal} size={18} className={p.accent} />
        <span className={`ml-1 text-sm font-bold ${p.accent}`}>{pos}</span>
      </div>
    );
  }
  return (
    <span className="text-sm tabular-nums w-full text-center text-zinc-500 font-mono font-semibold" aria-label={t('common.rankN', { pos })}>
      {pos}
    </span>
  );
}

function UserAvatar({ avatarUrl, name, ring }: { avatarUrl?: string; name?: string; ring?: string }) {
  if (avatarUrl) {
    return (
      <LazyImage
        src={avatarUrl}
        alt={name}
        className={`size-10 rounded-full object-cover flex-shrink-0 ${ring ?? ''}`}
      />
    );
  }
  return (
    <div className={`size-10 rounded-full bg-gradient-to-br from-primary/80 to-accent-blue flex items-center justify-center flex-shrink-0 font-bold text-zinc-950 text-sm select-none ${ring ?? ''}`}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

export default function LeaderboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'all'>('all');

  const PAGE_SIZE = 25;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getLeaderboard(PAGE_SIZE, 0)
      .then((data) => {
        const d = data as { users: LeaderEntry[]; hasMore: boolean };
        setUsers(d.users);
        setHasMore(d.hasMore);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const loadMore = () => {
    setLoadingMore(true);
    getLeaderboard(PAGE_SIZE, users.length)
      .then((data) => {
        const d = data as { users: LeaderEntry[]; hasMore: boolean };
        setUsers(prev => [...prev, ...d.users]);
        setHasMore(d.hasMore);
      })
      .catch(() => { })
      .finally(() => setLoadingMore(false));
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col px-4 pt-8 pb-16 max-w-5xl mx-auto w-full animate-fade-in">
        
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-heading font-semibold text-foreground">
              {t('badges.leaderboard.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {t('badges.leaderboard.subtitle')}
            </p>
          </div>
          
          {/* Tabs */}
          <div className="flex p-1 gap-1">
            <button 
              onClick={() => setTimeFilter('week')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${timeFilter === 'week' ? 'bg-zinc-700/60 text-zinc-100 border border-zinc-600/50 shadow-sm' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'}`}
            >
              {t('badges.leaderboard.thisWeek')}
            </button>
            <button 
              onClick={() => setTimeFilter('month')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${timeFilter === 'month' ? 'bg-zinc-700/60 text-zinc-100 border border-zinc-600/50 shadow-sm' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'}`}
            >
              {t('badges.leaderboard.thisMonth')}
            </button>
            <button 
              onClick={() => setTimeFilter('all')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${timeFilter === 'all' ? 'bg-zinc-700/60 text-zinc-100 border border-zinc-600/50 shadow-sm' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'}`}
            >
              {t('badges.leaderboard.allTime')}
            </button>
          </div>
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
            <Icon name="timer" size={40} className="text-zinc-700" />
            <p className="text-sm text-muted-foreground">{t('badges.leaderboard.empty')}</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden border border-zinc-800/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    <th className="py-4 px-4 w-16 text-center">#</th>
                    <th className="py-4 px-4">{t('badges.leaderboard.creator')}</th>
                    <th className="py-4 px-4 text-right">{t('badges.leaderboard.projectsCol')}</th>
                    <th className="py-4 px-4 text-right">{t('badges.leaderboard.linesCol')}</th>
                    <th className="py-4 px-4 text-right">{t('badges.leaderboard.starsCol')}</th>
                    <th className="py-4 px-4 text-right">{t('badges.leaderboard.syncedCol')}</th>
                    <th className="py-4 px-4 text-right">{t('badges.leaderboard.xpCol')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {users.map((entry, i) => {
                    return (
                      <tr 
                        key={entry.id ?? entry.accountName} 
                        className="hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                        onClick={() => navigate(`/profile/${entry.accountName}`)}
                      >
                        <td className="py-3 px-4 text-center">
                          <RankBadge pos={i + 1} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-4">
                            <UserAvatar avatarUrl={entry.avatarUrl} name={entry.displayName || entry.accountName} ring={PODIUM[i + 1]?.ring} />
                            <div className="flex flex-col">
                              <span className={`font-semibold text-[15px] ${PODIUM[i + 1] ? PODIUM[i + 1].label : 'text-zinc-100'}`}>
                                {entry.displayName || entry.accountName}
                              </span>
                              <span className="text-xs text-zinc-500 mt-0.5">
                                {entry.accountName}
                                {(entry.progression?.level ?? 0) > 0 && ` · Nv. ${entry.progression!.level}`}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-zinc-400 text-[15px]">
                          {formatCount(entry.projectCount ?? 0)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-zinc-200 font-semibold text-[15px]">
                          {formatCount(entry.stats?.syncedLines ?? 0)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-zinc-400 text-[15px]">
                          {PODIUM[i + 1] && i < 3 ? <span className="text-warning font-semibold">{formatCount(entry.totalStarsReceived ?? 0)}</span> : formatCount(entry.totalStarsReceived ?? 0)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-zinc-200 font-bold text-[15px]">
                          {formatTime(entry.stats?.minutesSynced, entry.stats?.secondsSynced)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-primary/80 font-bold text-[15px]">
                          {Math.round(entry.rankScore ?? 0).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="border-t border-zinc-800/50 p-4 flex justify-center bg-zinc-900/20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="gap-1.5"
                >
                  {loadingMore ? <Icon name="autorenew" size={14} className="animate-spin" /> : <Icon name="expand_more" size={14} />}
                  {t('common.loadMore')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
