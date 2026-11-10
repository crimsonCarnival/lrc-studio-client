import { projectPath } from '@/features/projects/project-path';
import type { Project } from '@/types';

/**
 * A list track's page, keeping the list context. Null when the track has no
 * owner account name (no canonical URL), so callers render it non-navigable
 * rather than pointing at a path that would 404.
 */
export function listTrackHref(track: Pick<Project, 'publicId' | 'slug' | 'title' | 'metadata' | 'user'>, listId: string): string | null {
  const base = projectPath(track);
  return base && `${base}?list=${encodeURIComponent(listId)}`;
}

/** Previous / next track controls for the playback bar, present only in list context. */
export type ListNav = {
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
};
