import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { gqlRequest } from '@/app/graphql.client';

const GET_ACTIVITY_HEATMAP = `
  query {
    userActivityHeatmap { date count }
  }
`;

const WEEKS = 12;
const DAYS_PER_WEEK = 7;

function toDateKey(d) {
  return d.toISOString().slice(0, 10);
}

// Builds a WEEKS x 7 grid ending today, Monday-first rows.
function buildGrid(countsByDate) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Find the most recent Sunday (grid end) so columns align to full weeks.
  const endOfWeek = new Date(today);
  endOfWeek.setUTCDate(today.getUTCDate() + (6 - ((today.getUTCDay() + 6) % 7)));

  const totalDays = WEEKS * DAYS_PER_WEEK;
  const start = new Date(endOfWeek);
  start.setUTCDate(endOfWeek.getUTCDate() - totalDays + 1);

  const days = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = toDateKey(d);
    days.push({ date: key, count: countsByDate.get(key) ?? 0, isFuture: d > today });
  }

  // Group into weeks (columns), each with 7 days (rows, Mon-Sun)
  const weeks = [];
  for (let w = 0; w < WEEKS; w++) {
    weeks.push(days.slice(w * DAYS_PER_WEEK, (w + 1) * DAYS_PER_WEEK));
  }
  return weeks;
}

function intensityClass(count) {
  if (count === 0) return 'bg-secondary/30';
  if (count <= 2) return 'bg-accent/30';
  if (count <= 5) return 'bg-accent/55';
  if (count <= 9) return 'bg-accent/80';
  return 'bg-accent';
}

export default function ActivityHeatmap() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { userActivityHeatmap } = await gqlRequest(GET_ACTIVITY_HEATMAP);
        if (isMounted) setData(userActivityHeatmap);
      } catch {
        if (isMounted) setData([]);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const countsByDate = useMemo(() => {
    const map = new Map();
    for (const day of data ?? []) map.set(day.date, day.count);
    return map;
  }, [data]);

  const weeks = useMemo(() => buildGrid(countsByDate), [countsByDate]);

  const total = useMemo(
    () => (data ?? []).reduce((sum, d) => sum + d.count, 0),
    [data]
  );

  if (data === null) {
    return (
      <div className="flex items-center justify-center py-6 text-zinc-500">
        <div className="text-xs">{t('profile.loading') || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1 overflow-x-auto pb-2">
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                onMouseEnter={() => setHovered(day)}
                onMouseLeave={() => setHovered(null)}
                className={`size-3 rounded-sm ${day.isFuture ? 'bg-transparent' : intensityClass(day.count)} transition-colors`}
                title={`${day.date}: ${day.count}`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {hovered
            ? `${hovered.count} ${t('profile.heatmap.activities') || 'activities'} — ${hovered.date}`
            : `${total} ${t('profile.heatmap.totalActivities') || 'activities in the last 90 days'}`}
        </span>
        <div className="flex items-center gap-1">
          <span>{t('profile.heatmap.less') || 'Less'}</span>
          <div className="size-3 rounded-sm bg-secondary/30" />
          <div className="size-3 rounded-sm bg-accent/30" />
          <div className="size-3 rounded-sm bg-accent/55" />
          <div className="size-3 rounded-sm bg-accent/80" />
          <div className="size-3 rounded-sm bg-accent" />
          <span>{t('profile.heatmap.more') || 'More'}</span>
        </div>
      </div>
    </div>
  );
}
