import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { gqlRequest } from '@/app/graphql.client';
import { Tip } from '@/shared/ui/tip';
import { Skeleton } from '@ui/skeleton';
import { useStreakResetHint } from '@/shared/hooks/useStreakResetHint';
import { LevelLadder } from './LevelLadder';

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

function StatCard({ label, value, tip, accent = false }: { label: ReactNode; value: ReactNode; tip: ReactNode; accent?: boolean }) {
  return (
    <Tip content={tip}>
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 cursor-default">
        <p className={`text-2xl font-extrabold leading-tight ${accent ? 'text-primary' : 'text-zinc-100'}`}>{value}</p>
        <p className="text-[13px] text-zinc-400 mt-1 leading-snug">{label}</p>
      </div>
    </Tip>
  );
}

function ProjectStatCard({ label, title, count, tip, linesLabel }: { label: ReactNode; title: ReactNode; count: ReactNode; tip: ReactNode; linesLabel: string }) {
  return (
    <Tip content={tip}>
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 cursor-default min-w-0">
        <p className="text-[13px] text-zinc-400 mb-1">{label}</p>
        <p className="text-[17px] font-extrabold text-zinc-100 truncate">{title}</p>
        <p className="text-[13px] text-zinc-400 mt-0.5">{count} {linesLabel}</p>
      </div>
    </Tip>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5 mt-5">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 space-y-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function StatsTab() {
  const { t, i18n } = useTranslation();
  // addictionLevel uses a default-value string fallback.
  const tk = t as (key: string, defaultValue?: string) => string;
  const streakResetHint = useStreakResetHint();
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
        <p className="text-sm">{error || t('common.loadError')}</p>
      </div>
    );
  }

  const trendUp = stats.syncTrendPercentage >= 0;
  const grid = 'grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(150px,1fr))]';

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.08em] text-primary">{tk('profile.stats.addictionLevel')}</p>
          <p className="text-[26px] font-extrabold text-zinc-100 mt-1">
            {stats.addictionTitle?.[i18n.language === 'es' ? 'es' : 'en']}
          </p>
        </div>
        <Tip content={t('profile.stats.tips.syncTrend')}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-[10px] font-bold cursor-default ${trendUp ? 'bg-teal-950 text-teal-300' : 'bg-red-950 text-red-300'}`}>
            <Icon name={trendUp ? 'trending_up' : 'trending_down'} size={18} />
            {(t as (k: string, o?: object) => string)('profile.stats.trendChip', { value: `${stats.syncTrendPercentage > 0 ? '+' : ''}${stats.syncTrendPercentage}` })}
          </div>
        </Tip>
      </div>

      <div className={`${grid} mt-[22px]`}>
        <StatCard label={t('profile.stats.musicSynced')} value={<SyncTimeDisplay minutes={stats.musicSyncedMinutes} seconds={stats.musicSyncedSeconds} />} tip={t('profile.stats.tips.musicSynced')} />
        <StatCard label={t('profile.stats.totalLinesSynced')} value={stats.syncedLines} tip={t('profile.stats.tips.totalLinesSynced')} />
        <StatCard label={t('profile.stats.wordsTimestamped')} value={stats.wordsTimestamped} tip={t('profile.stats.tips.wordsTimestamped')} />
        <StatCard label={t('profile.stats.karaokeLines')} value={stats.karaokeLines} tip={t('profile.stats.tips.karaokeLines')} />
        <StatCard label={t('profile.stats.fullySynced')} value={`${stats.fullySyncedProjects} / ${stats.totalProjects}`} tip={t('profile.stats.tips.fullySynced')} />
        <StatCard label={t('profile.stats.avgProjectCompletion')} value={`${stats.averageProjectCompletion}%`} tip={t('profile.stats.tips.avgProjectCompletion')} />
        <StatCard label={t('profile.stats.avgLinesPerProject')} value={stats.averageLinesPerProject} tip={t('profile.stats.tips.avgLinesPerProject')} />
        <StatCard
          label={t('profile.stats.streakCurrentLongest')}
          value={`${stats.currentStreak} d · ${stats.longestStreak} d`}
          tip={<>{t('profile.stats.tips.currentStreak')} {streakResetHint}</>}
        />
      </div>

      <div className="grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(220px,1fr))] mt-2.5">
        {stats.mostSyncedProject && (
          <ProjectStatCard label={t('profile.stats.mostSynced')} title={stats.mostSyncedProject.title} count={stats.mostSyncedProject.count} linesLabel={t('profile.stats.linesUnit')} tip={t('profile.stats.tips.mostSynced')} />
        )}
        {stats.largestProject && (
          <ProjectStatCard label={t('profile.stats.largestProject')} title={stats.largestProject.title} count={stats.largestProject.count} linesLabel={t('profile.stats.linesUnit')} tip={t('profile.stats.tips.largestProject')} />
        )}
        <Tip content={t('profile.stats.tips.starsReceived')}>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 cursor-default min-w-0">
            <p className="text-[13px] text-zinc-400 mb-1">{t('profile.stats.community')}</p>
            <p className="text-[17px] font-extrabold text-zinc-100">{t('profile.stats.communityValue', { stars: stats.starsReceived, forks: stats.forksReceived })}</p>
            <p className="text-[13px] text-zinc-400 mt-0.5">{t('profile.stats.publicProjectsCount', { count: stats.publicProjects })}</p>
          </div>
        </Tip>
      </div>

      <LevelLadder currentId={stats.addictionId} />
    </div>
  );
}
