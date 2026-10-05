import type { InfiniteData } from '@tanstack/react-query';
import { queryClient } from './query.client';

/**
 * Keeps cached lists in step with writes. The service functions that perform a
 * write call these after it succeeds, so no screen has to remember which other
 * screens show the same data.
 *
 * Two tools, used together:
 * - patch: edit every cached copy at once, for changes whose outcome is known
 *   (a deleted project is gone everywhere) — no flash of stale data.
 * - invalidate: mark a family of queries stale and refetch the ones on screen,
 *   for effects only the server can compute (counts, rankings).
 */

type WithProjects = { projects?: Array<{ publicId?: string }>; projectCount?: number };
type WithFollowFlag = { accountName?: string | null; isFollowedByMe?: boolean };
type FollowPage = { users: WithFollowFlag[] };

const invalidate = (...queryKey: string[]) => { void queryClient.invalidateQueries({ queryKey }); };

/** A project was created, edited, published, starred or forked. */
export function projectsChanged(): void {
  invalidate('projects');
  invalidate('profile');
  invalidate('explore', 'trending');
}

/** A project was deleted: drop it from every cached list before refetching. */
export function projectRemoved(publicId: string): void {
  queryClient.setQueriesData<Array<{ publicId?: string }>>(
    { queryKey: ['projects', 'mine'] },
    (list) => list?.filter((p) => p.publicId !== publicId),
  );
  queryClient.setQueriesData<WithProjects | null>({ queryKey: ['profile'] }, (profile) => {
    if (!profile?.projects?.some((p) => p.publicId === publicId)) return profile;
    return {
      ...profile,
      projects: profile.projects.filter((p) => p.publicId !== publicId),
      projectCount: Math.max(0, (profile.projectCount ?? 1) - 1),
    };
  });
  projectsChanged();
  invalidate('playlists');
}

/** The viewer followed or unfollowed `accountName`. */
export function followChanged(accountName: string, follow: boolean): void {
  // The same person can appear in several cached follow lists and tabs.
  queryClient.setQueriesData<InfiniteData<FollowPage>>({ queryKey: ['followList'] }, (data) => data && {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      users: page.users.map((u) => (u.accountName === accountName ? { ...u, isFollowedByMe: follow } : u)),
    })),
  });
  queryClient.setQueriesData<WithFollowFlag | null>({ queryKey: ['profile', accountName] }, (profile) =>
    profile ? { ...profile, isFollowedByMe: follow } : profile);
  // Follower/following counts on both profiles, and whose activity the feed shows.
  invalidate('profile');
  invalidate('feed');
}

/** The viewer blocked or unblocked someone: they vanish from, or return to, every social surface. */
export function blockChanged(): void {
  invalidate('profile');
  invalidate('followList');
  invalidate('feed');
  invalidate('explore');
}

/** A playlist was created, edited, deleted, or had projects added or removed. */
export function playlistsChanged(): void {
  invalidate('playlists');
  invalidate('profile');
  invalidate('explore', 'playlists');
}

/** An upload was added, renamed or deleted; project cards embed their upload's title. */
export function uploadsChanged(): void {
  invalidate('uploads');
  invalidate('projects');
}
