import type { EditorLine } from '@/features/editor/editor.types';

export type PublishMissing = 'title' | 'artist' | 'cover' | 'lines';

export type PublishReadiness = {
  timed: number;
  total: number;
  /** Safe to offer Publish: a title and every lyric line timed. Artist and cover never block. */
  complete: boolean;
  missing: PublishMissing[];
};

/**
 * Whether a project is ready to be shown to other people. Only the title and the lyric
 * lines block; a missing artist or cover is reported so the dialog can flag it.
 */
export function getPublishReadiness(
  lines: EditorLine[],
  meta: { title?: string; artists?: string[]; coverImage?: string },
): PublishReadiness {
  const lyric = lines.filter((l) => l.type !== 'section');
  // Same rule as the privacy migration: a line is timed by its start time or by any word time.
  // An end time alone does not count.
  const timed = lyric.filter((l) => l.timestamp != null || l.words?.some((w) => w.time != null)).length;
  const total = lyric.length;
  const linesDone = total > 0 && timed === total;
  const hasTitle = !!meta.title?.trim();

  const missing: PublishMissing[] = [];
  if (!hasTitle) missing.push('title');
  if (!meta.artists?.some((a) => a.trim())) missing.push('artist');
  if (!meta.coverImage?.trim()) missing.push('cover');
  if (!linesDone) missing.push('lines');

  return { timed, total, complete: hasTitle && linesDone, missing };
}
