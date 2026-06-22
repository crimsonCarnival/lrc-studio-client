import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { gqlRequest } from '@/app/graphql.client';
import { Tip } from '@/shared/ui/tip';
import { Skeleton } from '@ui/skeleton';

const GET_CONTENT_STATS = /* GraphQL */ `
  query UserContentStats {
    userContentStats {
      totalProjects
      totalLines
      syncedLines
      completionPercentage
      averageProjectCompletion
      averageLinesPerProject
      fullySyncedProjects
      musicSyncedMinutes
      wordsTimestamped
      karaokeLines
      publicProjects
      starsReceived
      forksReceived
      mostSyncedProject { title count }
      largestProject { title count }
      syncTrendPercentage
      musicSyncedSeconds
      addictionId
      addictionTitle { en es }
      currentStreak
      longestStreak
    }
  }
`;

interface ProjectStat {
  title: string;
  count: number;
}

interface ContentStats {
  totalProjects: number;
  totalLines: number;
  syncedLines: number;
  completionPercentage: number;
  averageProjectCompletion: number;
  averageLinesPerProject: number;
  fullySyncedProjects: number;
  musicSyncedMinutes: number;
  wordsTimestamped: number;
  karaokeLines: number;
  publicProjects: number;
  starsReceived: number;
  forksReceived: number;
  mostSyncedProject?: ProjectStat | null;
  largestProject?: ProjectStat | null;
  syncTrendPercentage: number;
  musicSyncedSeconds: number;
  addictionId?: string;
  addictionTitle?: { en?: string; es?: string };
  currentStreak: number;
  longestStreak: number;
}

function SyncTimeDisplay({ minutes, seconds }: { minutes: number; seconds: number }) {
  const totalSeconds = (minutes * 60) + seconds;
  const hours = Math.floor(totalSeconds / 3600);
  const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours === 0) {
    if (remainingMinutes === 0 && remainingSeconds === 0) {
      return <span>0m 0s</span>;
    }
    return <span>{remainingMinutes}m {remainingSeconds}s</span>;
  }

  return (
    <span>
      {hours}h {remainingMinutes}m <span className="text-sm text-muted-foreground">{remainingSeconds}s</span>
    </span>
  );
}

function StatCard({ label, value, tip, accent = false, className = '' }: { label: ReactNode; value: ReactNode; tip: ReactNode; accent?: boolean; className?: string }) {
  return (
    <Tip content={tip}>
      <div className={`rounded-lg border border-border/50 bg-secondary/20 p-4 text-center cursor-default ${className}`}>
        <p className="text-xs text-muted-foreground mb-2">{label}</p>
        <p className={`text-2xl font-bold ${accent ? 'text-accent' : 'text-foreground'}`}>{value}</p>
      </div>
    </Tip>
  );
}

function TrendCard({ label, percentage, tip }: { label: ReactNode; percentage: number; tip: ReactNode }) {
  const isPositive = percentage >= 0;
  return (
    <Tip content={tip}>
      <div className="rounded-lg border border-border/50 bg-secondary/20 p-4 text-center cursor-default">
        <p className="text-xs text-muted-foreground mb-2">{label}</p>
        <div className="flex items-center justify-center gap-2">
          {isPositive ? (
            <TrendingUp className="size-5 text-success" />
          ) : (
            <TrendingDown className="size-5 text-destructive" />
          )}
          <p className={`text-2xl font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {percentage > 0 ? '+' : ''}{percentage}%
          </p>
        </div>
      </div>
    </Tip>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }, (_, row) => (
        <div key={row} className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-lg border border-border/50 bg-secondary/20 p-4 text-center space-y-2">
              <Skeleton className="h-3 w-16 mx-auto" />
              <Skeleton className="h-7 w-12 mx-auto" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function StatsTab() {
  const { t, i18n } = useTranslation();
  // addictionLevel uses a default-value string fallback.
  const tk = t as (key: string, defaultValue?: string) => string;
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { userContentStats } = await gqlRequest(GET_CONTENT_STATS) as { userContentStats: ContentStats };
        if (isMounted) {
          setStats(userContentStats);
          setError(null);
        }
      } catch (e) {
        const err = e as { message?: string };
        if (isMounted) {
          setError(err.message ?? null);
          setStats(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return <StatsSkeleton />;
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center py-6 text-zinc-500">
        <p className="text-xs">{error || 'Failed to load stats'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Addiction Title Banner */}
      <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-center justify-between mb-8 shadow-sm">
        <div className="flex flex-col">
          <span className="text-sm text-primary/80 font-medium uppercase tracking-wider">{tk('profile.stats.addictionLevel')}</span>
          <span className="text-2xl font-bold text-foreground">
            {stats.addictionTitle?.[i18n.language === 'es' ? 'es' : 'en']}
          </span>
        </div>
      </div>

      {/* Primary metrics */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label={t('profile.stats.musicSynced')}
          value={<SyncTimeDisplay minutes={stats.musicSyncedMinutes} seconds={stats.musicSyncedSeconds} />}
          tip={t('profile.stats.tips.musicSynced')}
        />
        <StatCard
          label={t('profile.stats.totalLinesSynced')}
          value={stats.syncedLines}
          tip={t('profile.stats.tips.totalLinesSynced')}
        />
        <StatCard
          label={t('profile.stats.completionPercentage')}
          value={`${stats.completionPercentage}%`}
          tip={t('profile.stats.tips.completionPercentage')}
          accent
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label={t('profile.stats.projectsCreated')}
          value={stats.totalProjects}
          tip={t('profile.stats.tips.projectsCreated')}
        />
        <StatCard
          label={t('profile.stats.avgLinesPerProject')}
          value={stats.averageLinesPerProject}
          tip={t('profile.stats.tips.avgLinesPerProject')}
        />
        <StatCard
          label={t('profile.stats.fullySynced')}
          value={stats.fullySyncedProjects}
          tip={t('profile.stats.tips.fullySynced')}
        />
      </div>

      {/* Additional metrics */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label={t('profile.stats.avgProjectCompletion')}
          value={`${stats.averageProjectCompletion}%`}
          tip={t('profile.stats.tips.avgProjectCompletion')}
        />
        <StatCard
          label={t('profile.stats.wordsTimestamped')}
          value={stats.wordsTimestamped}
          tip={t('profile.stats.tips.wordsTimestamped')}
        />
        <StatCard
          label={t('profile.stats.karaokeLines')}
          value={stats.karaokeLines}
          tip={t('profile.stats.tips.karaokeLines')}
        />
        <div className="col-span-full border-t border-border/50 my-2" />
        <StatCard label={t('profile.stats.currentStreak')} value={`${stats.currentStreak}d`} tip={t('profile.stats.tips.currentStreak')} />
        <StatCard label={t('profile.stats.longestStreak')} value={`${stats.longestStreak}d`} tip={t('profile.stats.tips.longestStreak')} />

        <div className="col-span-full border-t border-border/50 my-2" />
        <TrendCard
          label={t('profile.stats.syncTrend')}
          percentage={stats.syncTrendPercentage}
          tip={t('profile.stats.tips.syncTrend')}
        />
      </div>

      {/* Projects info */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={t('profile.stats.publicProjects')}
          value={stats.publicProjects}
          tip={t('profile.stats.tips.publicProjects')}
        />
        <StatCard
          label={t('profile.stats.starsReceived')}
          value={stats.starsReceived}
          tip={t('profile.stats.tips.starsReceived')}
        />
      </div>

      {/* Special projects */}
      {(stats.mostSyncedProject || stats.largestProject) && (
        <div className="grid grid-cols-2 gap-3">
          {stats.mostSyncedProject && (
            <Tip content={t('profile.stats.tips.mostSynced')}>
              <div className="rounded-lg border border-border/50 bg-secondary/20 p-4 cursor-default">
                <p className="text-xs text-muted-foreground mb-2">{t('profile.stats.mostSynced')}</p>
                <p className="font-semibold text-foreground truncate">{stats.mostSyncedProject.title}</p>
                <p className="text-xs text-accent mt-1">{stats.mostSyncedProject.count} lines</p>
              </div>
            </Tip>
          )}
          {stats.largestProject && (
            <Tip content={t('profile.stats.tips.largestProject')}>
              <div className="rounded-lg border border-border/50 bg-secondary/20 p-4 cursor-default">
                <p className="text-xs text-muted-foreground mb-2">{t('profile.stats.largestProject')}</p>
                <p className="font-semibold text-foreground truncate">{stats.largestProject.title}</p>
                <p className="text-xs text-accent mt-1">{stats.largestProject.count} lines</p>
              </div>
            </Tip>
          )}
        </div>
      )}

      {/* Forks metric */}
      <StatCard
        label={t('profile.stats.forksReceived')}
        value={stats.forksReceived}
        tip={t('profile.stats.tips.forksReceived')}
        className="col-span-1"
      />
    </div>
  );
}
