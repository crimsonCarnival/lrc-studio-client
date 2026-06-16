import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { gqlRequest } from '@/app/graphql.client';

const GET_CONTENT_STATS = `
  query {
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
    }
  }
`;

function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function StatCard({ label, value, accent = false, className = '' }) {
  return (
    <div className={`rounded-lg border border-border/50 bg-secondary/20 p-4 text-center ${className}`}>
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-accent' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function TrendCard({ label, percentage }) {
  const isPositive = percentage >= 0;
  return (
    <div className="rounded-lg border border-border/50 bg-secondary/20 p-4 text-center">
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
  );
}

export default function StatsTab() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { userContentStats } = await gqlRequest(GET_CONTENT_STATS);
        if (isMounted) {
          setStats(userContentStats);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
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
    return (
      <div className="flex items-center justify-center py-6 text-zinc-500">
        <div className="text-xs">{t('profile.loading') || 'Loading...'}</div>
      </div>
    );
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
      {/* Primary metrics */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label={t('profile.stats.musicSynced')}
          value={formatMinutes(stats.musicSyncedMinutes)}
        />
        <StatCard
          label={t('profile.stats.totalLinesSynced')}
          value={stats.syncedLines}
        />
        <StatCard
          label={t('profile.stats.completionPercentage')}
          value={`${stats.completionPercentage}%`}
          accent
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label={t('profile.stats.projectsCreated')}
          value={stats.totalProjects}
        />
        <StatCard
          label={t('profile.stats.avgLinesPerProject')}
          value={stats.averageLinesPerProject}
        />
        <StatCard
          label={t('profile.stats.fullySynced')}
          value={stats.fullySyncedProjects}
        />
      </div>

      {/* Additional metrics */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label={t('profile.stats.avgProjectCompletion')}
          value={`${stats.averageProjectCompletion}%`}
        />
        <StatCard
          label={t('profile.stats.wordsTimestamped')}
          value={stats.wordsTimestamped}
        />
        <StatCard
          label={t('profile.stats.karaokeLines')}
          value={stats.karaokeLines}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <TrendCard
          label={t('profile.stats.syncTrend')}
          percentage={stats.syncTrendPercentage}
        />
      </div>

      {/* Projects info */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={t('profile.stats.publicProjects')}
          value={stats.publicProjects}
        />
        <StatCard
          label={t('profile.stats.starsReceived')}
          value={stats.starsReceived}
        />
      </div>

      {/* Special projects */}
      {(stats.mostSyncedProject || stats.largestProject) && (
        <div className="grid grid-cols-2 gap-3">
          {stats.mostSyncedProject && (
            <div className="rounded-lg border border-border/50 bg-secondary/20 p-4">
              <p className="text-xs text-muted-foreground mb-2">{t('profile.stats.mostSynced')}</p>
              <p className="font-semibold text-foreground truncate">{stats.mostSyncedProject.title}</p>
              <p className="text-xs text-accent mt-1">{stats.mostSyncedProject.count} lines</p>
            </div>
          )}
          {stats.largestProject && (
            <div className="rounded-lg border border-border/50 bg-secondary/20 p-4">
              <p className="text-xs text-muted-foreground mb-2">{t('profile.stats.largestProject')}</p>
              <p className="font-semibold text-foreground truncate">{stats.largestProject.title}</p>
              <p className="text-xs text-accent mt-1">{stats.largestProject.count} lines</p>
            </div>
          )}
        </div>
      )}

      {/* Forks metric */}
      <StatCard
        label={t('profile.stats.forksReceived')}
        value={stats.forksReceived}
        className="col-span-1"
      />
    </div>
  );
}
