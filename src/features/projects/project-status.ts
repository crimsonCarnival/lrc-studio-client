export type ProjectStatus = 'inProgress' | 'completed' | 'notStarted';

type LineCounts = { lineCount?: number; syncedLineCount?: number };

/** Whole-number percentage of lines that carry a timestamp. */
export function projectProgress(p: LineCounts): number {
  return p.lineCount ? Math.min(100, Math.round(((p.syncedLineCount || 0) / p.lineCount) * 100)) : 0;
}

/** Where a project stands, from how many of its lines carry a timestamp. */
export function projectStatus(p: LineCounts): ProjectStatus {
  const progress = projectProgress(p);
  if (progress === 100) return 'completed';
  if (progress === 0) return 'notStarted';
  return 'inProgress';
}
