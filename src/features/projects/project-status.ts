export type ProjectStatus = 'inProgress' | 'completed' | 'notStarted';

/** Where a project stands, from how many of its lines carry a timestamp. */
export function projectStatus(p: { lineCount?: number; syncedLineCount?: number }): ProjectStatus {
  const progress = p.lineCount ? Math.min(100, Math.round(((p.syncedLineCount || 0) / p.lineCount) * 100)) : 0;
  if (progress === 100) return 'completed';
  if (progress === 0) return 'notStarted';
  return 'inProgress';
}
