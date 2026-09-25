import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gqlRequest } from '@/app/graphql.client';
import { Tip } from '@/shared/ui/tip';
import { Skeleton } from '@ui/skeleton';

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
  if (count === 0) return 'bg-zinc-800/40';
  if (count <= 2) return 'bg-primary/40';
  if (count <= 5) return 'bg-primary/60';
  if (count <= 9) return 'bg-primary/80';
  return 'bg-primary';
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
export default function ActivityHeatmap({ days: providedDays }: { days?: HeatDay[] } = {}) {
  const { t, i18n } = useTranslation();
  const [fetched, setFetched] = useState<HeatDay[] | null>(null);
  const data = providedDays ?? fetched;
  const [hovered, setHovered] = useState<GridDay | null>(null);
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

  useEffect(() => {
    if (data && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
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
    { range: t('profile.heatmap.tip0'), cls: 'bg-zinc-800/40' },
    { range: t('profile.heatmap.tip1'), cls: 'bg-primary/40' },
    { range: t('profile.heatmap.tip2'), cls: 'bg-primary/60' },
    { range: t('profile.heatmap.tip3'), cls: 'bg-primary/80' },
    { range: t('profile.heatmap.tip4'), cls: 'bg-primary' },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="overflow-x-auto pb-4 custom-scrollbar" ref={scrollRef}>
        <div className="min-w-max flex gap-2">
          <div className="grid gap-1 text-[10px] text-muted-foreground mt-6 text-right select-none" style={{ gridTemplateRows: `repeat(${DAYS_PER_WEEK}, 14px)` }}>
            {weekdayLabels.map((label, i) => (
              <span key={i} className={i % 2 === 1 ? 'leading-[14px]' : 'invisible'}>{label}</span>
            ))}
          </div>

          <div className="flex flex-col">
            <div className="relative h-6 text-[10px] text-muted-foreground w-full select-none">
              {monthLabels.map((ml, i) => (
                <div key={i} className="absolute top-0 leading-6" style={{ left: `calc(${ml.col} * 18px)` }}>
                  {ml.month}
                </div>
              ))}
            </div>
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${WEEKS}, 14px)`,
                gridTemplateRows: `repeat(${DAYS_PER_WEEK}, 14px)`,
                gridAutoFlow: 'column',
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
                    className={`size-[14px] rounded-sm ${day.isFuture ? 'bg-transparent' : intensityClass(day.count)} transition-colors`}
                  />
                </Tip>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 text-xs text-muted-foreground min-w-0">
        <p className="text-foreground font-medium">
          {hovered
            ? `${hovered.count} ${t('profile.heatmap.activities')} — ${hovered.date}`
            : `${total} ${t('profile.heatmap.totalActivities')}`}
        </p>
        <div className="flex items-center gap-1.5">
          <span>{t('profile.heatmap.less')}</span>
          {legend.map((l) => (
            <Tip key={l.cls} content={l.range}>
              <div className={`size-3.5 rounded-sm ${l.cls}`} />
            </Tip>
          ))}
          <span>{t('profile.heatmap.more')}</span>
        </div>
        <p>{t('profile.heatmap.definition')}</p>
      </div>
    </div>
  );
}
