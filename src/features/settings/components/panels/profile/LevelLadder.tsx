import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { gqlRequest } from '@/app/graphql.client';
import { cn } from '@/shared/utils/utils';

const GET_LEVELS = /* GraphQL */ `
  query AddictionLevels {
    addictionLevels {
      id
      order
      title { en es }
      requirements { syncedLines karaokeLines musicSyncedMinutes publicProjects starsReceived wordsTimestamped totalProjects }
    }
  }
`;

const REQUIREMENT_KEYS = ['syncedLines', 'karaokeLines', 'wordsTimestamped', 'musicSyncedMinutes', 'totalProjects', 'publicProjects', 'starsReceived'] as const;
type RequirementKey = (typeof REQUIREMENT_KEYS)[number];

type Level = {
  id: string;
  order: number;
  title: { en?: string | null; es?: string | null };
  requirements?: Partial<Record<RequirementKey, number | null>> | null;
};

// The top of the ladder is gold: the three tiers that are the long-term goal.
const SUMMIT_TIERS = 3;

/**
 * Every tier from the top down, with the one you are on marked (redesign sheet 16).
 * Loaded on its own so the stats above it still render if this request fails.
 */
export function LevelLadder({ currentId }: { currentId?: string }) {
  const { t, i18n } = useTranslation();
  // One key per requirement kind, built at runtime, so it is outside the typed resources.
  const tk = t as (key: string, options?: Record<string, unknown>) => string;
  const [levels, setLevels] = useState<Level[] | null>(null);

  useEffect(() => {
    let mounted = true;
    gqlRequest<{ addictionLevels: Level[] }>(GET_LEVELS)
      .then(({ addictionLevels }) => { if (mounted) setLevels([...addictionLevels].sort((a, b) => b.order - a.order)); })
      // No ladder is better than an error box under stats that loaded fine.
      .catch(() => { if (mounted) setLevels([]); });
    return () => { mounted = false; };
  }, []);

  if (!levels || levels.length === 0) return null;

  const lang = i18n.language === 'es' ? 'es' : 'en';
  const currentIndex = levels.findIndex((level) => level.id === currentId);

  return (
    <section aria-labelledby="level-ladder-title" className="mt-6 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="level-ladder-title" className="text-sm font-semibold tracking-[0.06em] text-subtle uppercase">
          {t('profile.stats.ladder.title', { count: levels.length })}
        </h3>
        <span className="font-mono text-xs text-subtle">{t('profile.stats.ladder.direction')}</span>
      </div>
      <ol className="flex flex-col rounded-[var(--radius-card)] bg-background px-4 py-3 inset-ring inset-ring-hl">
        {levels.map((level, index) => {
          const tier = levels.length - index;
          const isCurrent = index === currentIndex;
          // Reached = this tier or any below it. Unknown current tier marks nothing as reached.
          const reached = currentIndex >= 0 && index >= currentIndex;
          const summit = index < SUMMIT_TIERS;
          const requirements = REQUIREMENT_KEYS
            .filter((key) => (level.requirements?.[key] ?? 0) > 0)
            .map((key) => tk(`profile.stats.ladder.req.${key}`, { count: level.requirements?.[key] ?? 0 }));
          return (
            <li
              key={level.id}
              aria-current={isCurrent ? 'true' : undefined}
              className={cn('grid grid-cols-[56px_24px_1fr] items-center gap-x-2 rounded-xl px-2 py-2', isCurrent && 'bg-primary-soft')}
            >
              <span className={cn('text-right font-mono text-[13px] font-medium', isCurrent ? 'text-primary-ink' : 'text-subtle')}>
                {t('profile.stats.ladder.tier', { tier })}
              </span>
              {/* The rail: a dot per tier joined by a line, lit up to where you are. */}
              <span aria-hidden className="relative grid h-full place-items-center">
                {index < levels.length - 1 && (
                  <span className={cn('absolute top-1/2 left-1/2 h-full w-0.5 -translate-x-1/2', reached ? 'bg-iris' : 'bg-hl')} />
                )}
                <span
                  className={cn(
                    'relative rounded-full',
                    isCurrent ? 'size-4 bg-iris ring-[3px] ring-primary-strong' : 'size-2.5',
                    !isCurrent && (reached ? 'bg-iris' : summit ? 'bg-gold' : 'bg-hl'),
                  )}
                />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={cn('truncate text-[17px] leading-tight font-semibold', reached ? 'text-foreground' : summit ? 'text-gold-ink' : 'text-subtle')}>
                    {level.title[lang] || level.title.en}
                  </span>
                  {isCurrent && (
                    <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 font-mono text-[11px] leading-none font-bold text-primary-foreground">
                      {t('profile.stats.ladder.you')}
                    </span>
                  )}
                </span>
                <span className="truncate font-mono text-xs text-subtle">
                  {requirements.length > 0 ? `≥ ${requirements.join(' · ')}` : t('profile.stats.ladder.always')}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
