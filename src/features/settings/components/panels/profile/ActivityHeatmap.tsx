import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gqlRequest } from '@/app/graphql.client';
import { Tip } from '@/shared/ui/tip';
import { Skeleton } from '@ui/skeleton';
import { Icon } from '@/shared/ui/Icon';

const GET_ACTIVITY_HEATMAP = /* GraphQL */ `
  query UserActivityHeatmap {
    userActivityHeatmap { date count }
  }
`;

const WEEKS = 52;
const DAYS_PER_WEEK = 7;

interface HeatDay {
  date: string;
  count: number;
}

interface GridDay {
  date: string;
  count: number;
  isFuture: boolean;
}

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Builds a flat, date-ascending list of WEEKS*7 days ending on the most
// recent Sunday-aligned week boundary, so a CSS grid with gridAutoFlow:
// 'column' and DAYS_PER_WEEK rows lays them out into perfect weekly columns.
function buildDays(countsByDate: Map<string, number>): GridDay[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const endOfWeek = new Date(today);
  endOfWeek.setUTCDate(today.getUTCDate() + (6 - ((today.getUTCDay() + 6) % 7)));

  const totalDays = WEEKS * DAYS_PER_WEEK;
  const start = new Date(endOfWeek);
  start.setUTCDate(endOfWeek.getUTCDate() - totalDays + 1);

  const days: GridDay[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = toDateKey(d);
    days.push({ date: key, count: countsByDate.get(key) ?? 0, isFuture: d > today });
  }
  return days;
}

function intensityClass(count: number) {
  if (count === 0) return 'bg-iris/[.07]';
  if (count <= 2) return 'bg-iris/25';
  if (count <= 5) return 'bg-iris/45';
  if (count <= 9) return 'bg-iris/70';
  return 'bg-primary-ink';
}

function HeatmapSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="overflow-x-auto pb-4">
        <div className="min-w-max flex gap-2">
          <div className="grid gap-1 mt-6 opacity-30" style={{ gridTemplateRows: `repeat(${DAYS_PER_WEEK}, 14px)` }}>
            <Skeleton className="w-6 h-[14px] invisible" />
            <Skeleton className="w-6 h-[14px] rounded-sm" />
            <Skeleton className="w-6 h-[14px] invisible" />
            <Skeleton className="w-6 h-[14px] rounded-sm" />
            <Skeleton className="w-6 h-[14px] invisible" />
            <Skeleton className="w-6 h-[14px] rounded-sm" />
            <Skeleton className="w-6 h-[14px] invisible" />
          </div>
          <div className="flex flex-col">
            <div className="h-6 w-full" />
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${WEEKS}, 14px)`,
                gridTemplateRows: `repeat(${DAYS_PER_WEEK}, 14px)`,
                gridAutoFlow: 'column',
              }}
            >
              {Array.from({ length: WEEKS * DAYS_PER_WEEK }, (_, i) => (
                <Skeleton key={i} className="size-[14px] rounded-sm" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2 hidden sm:block">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  );
}

/**
 * Without `days` it fetches the viewer's own heatmap (settings). With `days` it
 * renders the provided data read-only (public profile; the server only returns
 * it when the owner opted in).
 */
export default function ActivityHeatmap({
  days: providedDays,
  cellSize = 14,
  cellGap = 4,
  streak,
  compact = false,
  notes,
}: {
  days?: HeatDay[]; cellSize?: number; cellGap?: number; streak?: { current?: number | null; longest?: number | null } | null;
  /** Phone width: a slim stat row, and the long definition sits behind an info toggle. */
  compact?: boolean;
  /** Compact only: extra lines (e.g. the streak reset rule) shown with the definition. */
  notes?: string[];
} = {}) {
  // One week's horizontal advance. The month labels are absolutely positioned,
  // so they have to step by exactly this or they drift off their column.
  const step = cellSize + cellGap;
  const { t, i18n } = useTranslation();
  const [fetched, setFetched] = useState<HeatDay[] | null>(null);
  const data = providedDays ?? fetched;
  const [hovered, setHovered] = useState<GridDay | null>(null);
  const [showDefinition, setShowDefinition] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (providedDays) return;
    let isMounted = true;
    (async () => {
      try {
        const { userActivityHeatmap } = await gqlRequest(GET_ACTIVITY_HEATMAP) as { userActivityHeatmap: HeatDay[] };
        if (isMounted) setFetched(userActivityHeatmap);
      } catch {
        if (isMounted) setFetched([]);
      }
    })();
    return () => { isMounted = false; };
  }, [providedDays]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!data || !el) return;
    const toEnd = () => { el.scrollLeft = el.scrollWidth - el.clientWidth; };
    toEnd();
    // The panel around it can still be resolving its width on first paint, so
    // re-pin once the element's own box changes rather than trusting one pass.
    const ro = new ResizeObserver(toEnd);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data]);

  const countsByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const day of data ?? []) map.set(day.date, day.count);
    return map;
  }, [data]);

  const days = useMemo(() => buildDays(countsByDate), [countsByDate]);

  const monthLabels = useMemo(() => {
    if (!days.length) return [];
    const labels: { month: string; col: number }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < WEEKS; w++) {
      const d = new Date(days[w * 7].date);
      const m = d.getUTCMonth();
      if (m !== lastMonth) {
        labels.push({
          month: new Intl.DateTimeFormat(i18n.language || 'en', { month: 'short', timeZone: 'UTC' }).format(d),
          col: w,
        });
        lastMonth = m;
      }
    }
    return labels;
  }, [days, i18n.language]);

  // Sun..Sat short names in the UI language (2024-01-07 was a Sunday).
  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language || 'en', { weekday: 'short', timeZone: 'UTC' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 7 + i))));
  }, [i18n.language]);

  const total = useMemo(
    () => (data ?? []).reduce((sum, d) => sum + d.count, 0),
    [data]
  );

  if (data === null) {
    return <HeatmapSkeleton />;
  }

  const legend = [
    { range: t('profile.heatmap.tip0'), cls: 'bg-iris/[.07]' },
    { range: t('profile.heatmap.tip1'), cls: 'bg-iris/25' },
    { range: t('profile.heatmap.tip2'), cls: 'bg-iris/45' },
    { range: t('profile.heatmap.tip3'), cls: 'bg-iris/70' },
    { range: t('profile.heatmap.tip4'), cls: 'bg-primary-ink' },
  ];

  const STAT_CARD = 'flex flex-col gap-1 rounded-[calc(var(--radius)*1.4)] bg-background p-3.5 inset-ring inset-ring-hl';
  const STAT_VALUE = 'font-heading text-[28px] font-bold leading-[1.15] text-foreground';

  return (
    <div className={`flex flex-col w-full ${compact ? 'gap-3' : 'gap-6'}`}>
      {/* Streak stats (redesign sheet 10). Only where the caller knows the streak. */}
      {streak && compact && (
        <dl className="grid grid-cols-3 divide-x divide-hl rounded-[calc(var(--radius)*1.4)] bg-background py-2 inset-ring inset-ring-hl">
          {[
            { label: t('profile.heatmap.streakDays'), value: streak.current ?? 0, flame: true },
            { label: t('profile.heatmap.streakLongest'), value: streak.longest ?? 0 },
            { label: t('profile.heatmap.perYear'), value: total },
          ].map((stat) => (
            <div key={stat.label} className="flex min-w-0 flex-col-reverse items-center gap-0.5 px-2">
              <dt className="max-w-full truncate text-[11px] text-subtle">{stat.label}</dt>
              <dd className="flex items-center gap-1 font-heading text-xl font-bold leading-none text-foreground tabular-nums">
                {stat.flame && <Icon name="local_fire_department" size={16} className="text-gold-ink" />}
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {streak && !compact && (
        <div className="grid grid-cols-3 gap-2.5">
          <div className={STAT_CARD}>
            <span className="flex items-center gap-1.5 text-gold-ink">
              <Icon name="local_fire_department" size={18} className={(streak.current ?? 0) > 0 ? 'icon-flicker' : undefined} />
              <span className={STAT_VALUE}>{streak.current ?? 0}</span>
            </span>
            <span className="text-[13px] text-subtle">{t('profile.heatmap.streakDays')}</span>
          </div>
          <div className={STAT_CARD}>
            <span className={STAT_VALUE}>{streak.longest ?? 0}</span>
            <span className="text-[13px] text-subtle">{t('profile.heatmap.streakLongest')}</span>
          </div>
          <div className={STAT_CARD}>
            <span className={STAT_VALUE}>{total}</span>
            <span className="text-[13px] text-subtle">{t('profile.heatmap.perYear')}</span>
          </div>
        </div>
      )}
      <div className={`overflow-x-auto custom-scrollbar ${compact ? 'overscroll-x-contain pb-2' : 'pb-4'}`} ref={scrollRef}>
        <div className="min-w-max flex gap-2">
          <div
            className="grid text-[10px] text-muted-foreground mt-6 text-right select-none"
            style={{ gridTemplateRows: `repeat(${DAYS_PER_WEEK}, ${cellSize}px)`, gap: `${cellGap}px` }}
          >
            {weekdayLabels.map((label, i) => (
              <span key={i} className={i % 2 === 1 ? '' : 'invisible'} style={{ lineHeight: `${cellSize}px` }}>{label}</span>
            ))}
          </div>

          <div className="flex flex-col">
            <div className="relative h-6 text-[10px] text-muted-foreground w-full select-none">
              {monthLabels.map((ml, i) => (
                <div key={i} className="absolute top-0 leading-6" style={{ left: `calc(${ml.col} * ${step}px)` }}>
                  {ml.month}
                </div>
              ))}
            </div>
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${WEEKS}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${DAYS_PER_WEEK}, ${cellSize}px)`,
                gridAutoFlow: 'column',
                gap: `${cellGap}px`,
              }}
            >
              {days.map((day) => (
                <Tip
                  key={day.date}
                  content={day.isFuture ? null : `${day.count} ${t('profile.heatmap.activities')} — ${day.date}`}
                >
                  <div
                    onMouseEnter={() => !day.isFuture && setHovered(day)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ width: cellSize, height: cellSize }}
                    className={`rounded-[calc(var(--radius)*0.4)] ${day.isFuture ? 'bg-transparent' : intensityClass(day.count)} transition-colors`}
                  />
                </Tip>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`flex flex-col text-xs text-muted-foreground min-w-0 ${compact ? 'gap-2' : 'gap-3'}`}>
        <p className="text-foreground font-medium">
          {hovered
            ? `${hovered.count} ${t('profile.heatmap.activities')} — ${hovered.date}`
            : `${total} ${t('profile.heatmap.totalActivities')}`}
        </p>
        <div className="flex items-center gap-1.5">
          <span>{t('profile.heatmap.less')}</span>
          {legend.map((l) => (
            <Tip key={l.cls} content={l.range}>
              <div className={`size-3.5 rounded-[calc(var(--radius)*0.4)] ${l.cls}`} />
            </Tip>
          ))}
          <span>{t('profile.heatmap.more')}</span>
        </div>
        {compact ? (
          <>
            <button
              type="button"
              aria-expanded={showDefinition}
              aria-controls="heatmap-definition"
              aria-label={t('home.activityInfo')}
              onClick={() => setShowDefinition((v) => !v)}
              className="-my-1.5 -ml-2 grid size-11 place-items-center self-start rounded-[calc(var(--radius)*1.4)] text-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus"
            >
              <Icon name="info" size={18} />
            </button>
            {showDefinition && (
              <div id="heatmap-definition" className="flex flex-col gap-2">
                {notes?.map((note) => <p key={note}>{note}</p>)}
                <p>{t('profile.heatmap.definition')}</p>
              </div>
            )}
          </>
        ) : (
          <p>{t('profile.heatmap.definition')}</p>
        )}
      </div>
    </div>
  );
}
