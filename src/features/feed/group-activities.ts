import type { ActivityType } from '@/types/graphql';

/** The fields grouping reads; the feed's activities carry more. */
export interface GroupableActivity {
  id: string;
  type: ActivityType | string;
  createdAt: string;
  actor: { accountName: string };
  target?: { accountName: string } | null;
  description?: string | null;
}

export type FeedFilter = 'all' | 'projects' | 'lists' | 'people';

export type FeedItem<A extends GroupableActivity> =
  | { kind: 'single'; activity: A }
  | { kind: 'group'; id: string; type: string; activities: A[] };

/** Activities that read fine as "did this N times". A share carries its own note, so it stays alone. */
const GROUPABLE = new Set(['PROJECT_PUBLISHED', 'PROJECT_STARRED', 'PROJECT_FORKED', 'PLAYLIST_CREATED', 'USER_FOLLOWED']);

/** Same actor and type within this long of the group's newest item joins the group. */
export const GROUP_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

const lower = (s?: string | null) => (s ?? '').toLowerCase();

export function matchesFilter(type: string, filter: FeedFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'lists') return type === 'PLAYLIST_CREATED';
  if (filter === 'people') return type === 'USER_FOLLOWED';
  return type.startsWith('PROJECT_');
}

/**
 * Collapses runs of the same person doing the same thing (four follows, two forks) into one
 * item, so a busy afternoon does not bury everything else. Only neighbours in the feed's own
 * order are joined: grouping never moves an activity past another one. A follow of the viewer
 * never joins a group, since that card offers "Follow back".
 */
export function groupActivities<A extends GroupableActivity>(activities: A[], viewer?: string | null): FeedItem<A>[] {
  const items: FeedItem<A>[] = [];
  const me = lower(viewer);
  const keyOf = (a: A) => {
    if (!GROUPABLE.has(a.type) || a.description) return null;
    const target = lower(a.target?.accountName);
    if (a.type === 'USER_FOLLOWED' && me && target === me) return null;
    // A star or fork of the viewer's own project reads differently ("2 of your projects"), so it groups apart.
    const mine = me && target === me ? 'mine' : 'other';
    return `${a.type}|${lower(a.actor.accountName)}|${mine}`;
  };

  let runKey: string | null = null;
  let run: A[] = [];
  const flush = () => {
    if (run.length === 1) items.push({ kind: 'single', activity: run[0] });
    else if (run.length > 1) items.push({ kind: 'group', id: `group-${run[0].id}`, type: run[0].type, activities: run });
    run = [];
    runKey = null;
  };

  for (const a of activities) {
    const key = keyOf(a);
    const withinWindow = run.length > 0
      && Math.abs(new Date(run[0].createdAt).getTime() - new Date(a.createdAt).getTime()) <= GROUP_WINDOW_MS;
    if (key && key === runKey && withinWindow) {
      run.push(a);
      continue;
    }
    flush();
    if (key) {
      runKey = key;
      run = [a];
    } else {
      items.push({ kind: 'single', activity: a });
    }
  }
  flush();
  return items;
}
