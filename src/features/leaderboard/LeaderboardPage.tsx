import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@/shared/ui/Icon';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import { LazyImage } from '@ui/LazyImage';
import { Button } from '@ui/button';
import { getLeaderboard } from './leaderboard.service';
import type { LeaderboardSort, LeaderboardSortDirection, LeaderboardTimeframe } from './leaderboard.service';
import { LogoLoader } from '@ui/LogoLoader';

interface LeaderEntry {
  id?: string;
  accountName: string;
  displayName?: string;
  avatarUrl?: string;
  badges?: { id: string }[];
  progression?: { level?: number; xp?: number };
  streak?: { current?: number };
  stats?: { karaokeLines?: number; minutesSynced?: number; secondsSynced?: number; syncedLines?: number; aiSyncedLines?: number; wordsSynced?: number; aiWordsSynced?: number };
  totalStarsReceived?: number;
  totalForksReceived?: number;
  projectCount?: number;
  rankScore?: number | null;
  periodXp?: number | null;
}

interface PodiumStyle {
  accent: string;
  medal: string;
  glow: string;
  ring: string;
  label: string;
}

type TimeFilter = 'week' | 'month' | 'all';

const TIMEFRAME_BY_FILTER: Record<TimeFilter, LeaderboardTimeframe> = {
  week: 'WEEK',
  month: 'MONTH',
  all: 'ALL_TIME',
};

/**
 * Columns the server can sort on, with the locale key used for their label.
 * `as const` keeps `labelKey` a literal union so i18next's typed `t()` accepts it.
 */
const SORT_COLUMNS = [
  { sort: 'PROJECTS', labelKey: 'badges.leaderboard.projectsCol' },
  { sort: 'LINES', labelKey: 'badges.leaderboard.linesCol' },
  { sort: 'STARS', labelKey: 'badges.leaderboard.starsCol' },
  { sort: 'TIME_SYNCED', labelKey: 'badges.leaderboard.syncedCol' },
  { sort: 'XP', labelKey: 'badges.leaderboard.xpCol' },
  // 'RANK' sorts on rankScore, which now has its own column. The '#' cell is
  // the row's position in the returned order, not a sortable value.
  { sort: 'RANK', labelKey: 'badges.leaderboard.rankScore' },
] as const satisfies readonly { sort: LeaderboardSort; labelKey: string }[];

type SortColumnLabelKey = (typeof SORT_COLUMNS)[number]['labelKey'];

/**
 * The view lives in the query string (`?period=&sort=&dir=`) so a sorted board
 * survives a reload and can be linked to, following the same whitelist-and-fall-
 * back shape SearchPage uses for its own `?tab=`/`?sort=`. An unrecognised value
 * falls back to the default rather than being forwarded to the server, where a
 * bad enum would fail variable coercion and 400 the whole request.
 */
const TIME_FILTERS = ['week', 'month', 'all'] as const;
const SORT_VALUES = SORT_COLUMNS.map((c) => c.sort);
const SORT_DIRS = ['ASC', 'DESC'] as const;

const DEFAULT_FILTER: TimeFilter = 'all';
const DEFAULT_SORT: LeaderboardSort = 'RANK';
const DEFAULT_DIR: LeaderboardSortDirection = 'DESC';

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

function RankBadge({ pos, podium }: { pos: number; podium?: boolean }) {
  const { t } = useTranslation();
  const p = podium ? PODIUM[pos] : undefined;
  if (p) {
    return (
      <div className="flex items-center justify-center">
        <Icon name={p.medal} size={18} className={p.accent} />
        <span className={`ml-1 text-sm font-bold ${p.accent}`}>{pos}</span>
      </div>
    );
  }
  return (
    <span
      className="text-sm tabular-nums w-full text-center text-zinc-500 font-mono font-semibold"
      aria-label={t('common.rankN', { pos })}
    >
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
  const [searchParams, setSearchParams] = useSearchParams();

  const readParam = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
    const raw = searchParams.get(key);
    return allowed.includes(raw as T) ? (raw as T) : fallback;
  };

  const timeFilter = readParam('period', TIME_FILTERS, DEFAULT_FILTER);
  const sortBy = readParam('sort', SORT_VALUES, DEFAULT_SORT);
  const sortDir = readParam('dir', SORT_DIRS, DEFAULT_DIR);
  const isDefaultView =
    timeFilter === DEFAULT_FILTER && sortBy === DEFAULT_SORT && sortDir === DEFAULT_DIR;

  /**
   * Writes the whole view at once. Values at their default are deleted rather
   * than written, so the canonical board has a clean URL and a shared link
   * carries only what the sender actually changed.
   *
   * `replace` matches SearchPage: a header click is a refinement, not a
   * destination. Pushing would make Back undo one sort at a time and strand the
   * viewer several presses deep in their own filtering — the reset control is
   * the way out instead.
   */
  const setView = (next: {
    period?: TimeFilter;
    sort?: LeaderboardSort;
    dir?: LeaderboardSortDirection;
  }) => {
    const period = next.period ?? timeFilter;
    const sort = next.sort ?? sortBy;
    const dir = next.dir ?? sortDir;
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      const write = (key: string, value: string, fallback: string) => {
        if (value === fallback) params.delete(key);
        else params.set(key, value);
      };
      write('period', period, DEFAULT_FILTER);
      write('sort', sort, DEFAULT_SORT);
      write('dir', dir, DEFAULT_DIR);
      return params;
    }, { replace: true });
  };

  const resetView = () =>
    setView({ period: DEFAULT_FILTER, sort: DEFAULT_SORT, dir: DEFAULT_DIR });

  const PAGE_SIZE = 25;
  const timeframe = TIMEFRAME_BY_FILTER[timeFilter];
  const isPeriod = timeframe !== 'ALL_TIME';

  const query = useInfiniteQuery({
    // timeframe/sort belong in the key: without them, switching a tab or a
    // column would serve the previous selection's cached rows. A distinct key is
    // a distinct cache entry, so paging also restarts from initialPageParam.
    queryKey: ['leaderboard', PAGE_SIZE, timeframe, sortBy, sortDir],
    // Rank scores are recomputed hourly on the server.
    staleTime: 60_000,
    queryFn: ({ pageParam }) =>
      getLeaderboard({ limit: PAGE_SIZE, offset: pageParam, timeframe, sortBy, sortDir }),
    initialPageParam: 0,
    // The server pages by offset, so the cursor is the count loaded so far.
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore ? pages.reduce((n, page) => n + page.users.length, 0) : undefined,
  });
  const users = useMemo(
    () => (query.data?.pages.flatMap((page) => page.users) ?? []) as LeaderEntry[],
    [query.data],
  );
  const loading = query.isPending;
  const error = query.isError;
  const hasMore = query.hasNextPage;
  const loadingMore = query.isFetchingNextPage;
  const loadMore = () => { void query.fetchNextPage(); };

  // First click on a column sorts it descending; clicking the active one flips.
  const toggleSort = (column: LeaderboardSort) => {
    if (column === sortBy) {
      setView({ dir: sortDir === 'DESC' ? 'ASC' : 'DESC' });
      return;
    }
    setView({ sort: column, dir: 'DESC' });
  };

  const ariaSort = (column: LeaderboardSort): 'ascending' | 'descending' | 'none' =>
    column === sortBy ? (sortDir === 'ASC' ? 'ascending' : 'descending') : 'none';

  const dirLabel = sortDir === 'ASC'
    ? t('badges.leaderboard.sortAscending')
    : t('badges.leaderboard.sortDescending');

  // Podium medals mean "top of the ranking". Under any other sort the first
  // three rows are just the extremes of that column — gold on the three
  // worst-starred users reads as an award. Only decorate the real ranking.
  const isRanking = sortBy === 'RANK' && sortDir === 'DESC';
  const podiumOf = (pos: number) => (isRanking ? PODIUM[pos] : undefined);

  /** XP column value: lifetime XP for all-time, in-window XP for week/month. */
  const xpOf = (entry: LeaderEntry) => (isPeriod ? entry.periodXp : entry.progression?.xp) ?? 0;

  /** Weighted-percentile ranking score, the basis of the default sort. */
  const scoreOf = (entry: LeaderEntry) => Math.round(entry.rankScore ?? 0).toLocaleString();

  const sortIcon = (column: LeaderboardSort) => (
    <Icon
      name={column === sortBy && sortDir === 'ASC' ? 'expand_less' : 'expand_more'}
      size={14}
      className={column === sortBy ? 'text-primary' : 'opacity-0 group-hover/sort:opacity-50 transition-opacity'}
    />
  );

  const SortableHeader = ({ column, labelKey }: { column: LeaderboardSort; labelKey: SortColumnLabelKey }) => {
    const label = t(labelKey);
    return (
      <th className="py-4 px-4 text-right" aria-sort={ariaSort(column)}>
        <button
          type="button"
          onClick={() => toggleSort(column)}
          aria-label={t('badges.leaderboard.sortByColumn', { column: label })}
          className={`group/sort inline-flex items-center justify-end gap-0.5 min-h-11 w-full rounded-md px-1 text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${column === sortBy ? 'text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <span>{label}</span>
          {sortIcon(column)}
        </button>
      </th>
    );
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col px-4 pt-8 pb-16 max-w-5xl mx-auto w-full animate-fade-in">

        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
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
              onClick={() => setView({ period: 'week' })}
              className={`px-4 py-1.5 coarse:py-3 text-sm font-medium rounded-md transition-colors ${timeFilter === 'week' ? 'bg-zinc-700/60 text-zinc-100 border border-zinc-600/50 shadow-sm' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'}`}
            >
              {t('badges.leaderboard.thisWeek')}
            </button>
            <button
              onClick={() => setView({ period: 'month' })}
              className={`px-4 py-1.5 coarse:py-3 text-sm font-medium rounded-md transition-colors ${timeFilter === 'month' ? 'bg-zinc-700/60 text-zinc-100 border border-zinc-600/50 shadow-sm' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'}`}
            >
              {t('badges.leaderboard.thisMonth')}
            </button>
            <button
              onClick={() => setView({ period: 'all' })}
              className={`px-4 py-1.5 coarse:py-3 text-sm font-medium rounded-md transition-colors ${timeFilter === 'all' ? 'bg-zinc-700/60 text-zinc-100 border border-zinc-600/50 shadow-sm' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'}`}
            >
              {t('badges.leaderboard.allTime')}
            </button>

            {/* The only one-click way back to the canonical board. Without it the
                sort could be undone only by reloading, since the view is written
                with `replace` and Back does not step through it. */}
            {!isDefaultView && (
              <button
                type="button"
                onClick={resetView}
                title={t('badges.leaderboard.resetView')}
                aria-label={t('badges.leaderboard.resetView')}
                className="ml-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 coarse:py-3 min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 text-sm font-medium rounded-md border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <Icon name="restart_alt" size={16} />
                <span className="hidden sm:inline">{t('badges.leaderboard.resetView')}</span>
              </button>
            )}
          </div>
        </div>

        {/* In period mode only the ranking is period-scoped: the other columns
            are lifetime totals, because the server has no per-period counters
            for them. Say so rather than letting the numbers imply otherwise. */}
        {isPeriod ? (
          <p className="text-xs text-muted-foreground mb-6 sm:text-right">
            {t('badges.leaderboard.periodNote')}
          </p>
        ) : (
          <div className="mb-6" />
        )}

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
            <p className="text-sm text-muted-foreground">{t(isPeriod ? 'badges.leaderboard.emptyPeriod' : 'badges.leaderboard.empty')}</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden border border-zinc-800/60">
            {/* The stacked card list cannot host table headers, so below lg the
                same sort state is driven by this column select + direction
                toggle. */}
            <div className="lg:hidden flex items-center gap-2 px-4 py-2 border-b border-zinc-800/50">
              <label htmlFor="leaderboard-sort" className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                {t('badges.leaderboard.sortControlLabel')}
              </label>
              <select
                id="leaderboard-sort"
                value={sortBy}
                onChange={(e) => setView({ sort: e.target.value as LeaderboardSort, dir: 'DESC' })}
                className="appearance-none bg-transparent hover:bg-zinc-800 text-xs min-h-11 text-zinc-300 hover:text-zinc-100 transition-colors pl-2 pr-6 rounded-lg outline-none cursor-pointer border-none"
              >
                {SORT_COLUMNS.map(({ sort, labelKey }) => (
                  <option key={sort} value={sort} className="bg-zinc-900">{t(labelKey)}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setView({ dir: sortDir === 'DESC' ? 'ASC' : 'DESC' })}
                aria-label={dirLabel}
                title={dirLabel}
                className="ml-auto inline-flex items-center justify-center size-11 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              >
                <Icon name={sortDir === 'ASC' ? 'expand_less' : 'expand_more'} size={18} />
              </button>
            </div>

            {/* Stacked cards below lg. The table needs 780px of columns, so on a
                phone it was a 390px window onto a wider grid: the last four
                stats sat off-screen behind a horizontal drag. */}
            <ul className="lg:hidden divide-y divide-zinc-800/50">
              {users.map((entry, i) => {
                const stats: [string, string][] = [
                  [t('badges.leaderboard.syncedCol'), formatTime(entry.stats?.minutesSynced, entry.stats?.secondsSynced)],
                  [t('badges.leaderboard.linesCol'), formatCount(entry.stats?.syncedLines ?? 0)],
                  [t('badges.leaderboard.projectsCol'), formatCount(entry.projectCount ?? 0)],
                  [t('badges.leaderboard.starsCol'), formatCount(entry.totalStarsReceived ?? 0)],
                  [t('badges.leaderboard.xpCol'), xpOf(entry).toLocaleString()],
                  [t('badges.leaderboard.rankScore'), scoreOf(entry)],
                ];
                return (
                  <li key={entry.id ?? entry.accountName}>
                    <button
                      type="button"
                      onClick={() => navigate(`/profile/${entry.accountName}`)}
                      className="w-full text-left px-4 py-3.5 hover:bg-zinc-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0"><RankBadge pos={i + 1} podium={isRanking} /></div>
                        <UserAvatar avatarUrl={entry.avatarUrl} name={entry.displayName || entry.accountName} ring={podiumOf(i + 1)?.ring} />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={`font-semibold text-sm truncate ${podiumOf(i + 1)?.label ?? 'text-zinc-100'}`}>
                            {entry.displayName || entry.accountName}
                          </span>
                          <span className="text-xs text-zinc-500 truncate">
                            {entry.accountName}
                            {(entry.progression?.level ?? 0) > 0 && ` · Nv. ${entry.progression!.level}`}
                          </span>
                        </div>
                      </div>
                      <dl className="mt-2.5 grid grid-cols-3 gap-y-2 gap-x-2 pl-1">
                        {stats.map(([label, value]) => (
                          <div key={label} className="min-w-0">
                            <dt className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 truncate">{label}</dt>
                            <dd className="text-xs font-semibold text-zinc-200 tabular-nums truncate">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[780px]">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    <th className="py-4 px-4 w-16 text-center">
                      <span aria-hidden="true">#</span>
                      <span className="sr-only">{t('badges.leaderboard.rankCol')}</span>
                    </th>
                    <th className="py-4 px-4">{t('badges.leaderboard.creator')}</th>
                    {SORT_COLUMNS.map(({ sort, labelKey }) => (
                      <SortableHeader key={sort} column={sort} labelKey={labelKey} />
                    ))}
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
                          <RankBadge pos={i + 1} podium={isRanking} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-4">
                            <UserAvatar avatarUrl={entry.avatarUrl} name={entry.displayName || entry.accountName} ring={podiumOf(i + 1)?.ring} />
                            <div className="flex flex-col">
                              <span className={`font-semibold text-[15px] ${podiumOf(i + 1)?.label ?? 'text-zinc-100'}`}>
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
                          {podiumOf(i + 1) ? <span className="text-warning font-semibold">{formatCount(entry.totalStarsReceived ?? 0)}</span> : formatCount(entry.totalStarsReceived ?? 0)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-zinc-200 font-bold text-[15px]">
                          {formatTime(entry.stats?.minutesSynced, entry.stats?.secondsSynced)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-primary/80 font-bold text-[15px]">
                          {xpOf(entry).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-zinc-400 text-[15px]">
                          {scoreOf(entry)}
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
                  {loadingMore ? <LogoLoader size={14} /> : <Icon name="expand_more" size={14} />}
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
