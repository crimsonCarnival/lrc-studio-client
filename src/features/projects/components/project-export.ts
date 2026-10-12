import { compileLRC, compileSRT } from '@/shared/utils/lrc';
import type { EditorLine } from '@/features/editor/services/editor.service';

export type ProjectExportFormat = 'lrc' | 'srt';

interface ExportableProject {
  title?: string;
  metadata?: { songName?: string };
}

// Shared by the overflow menu and the info panel's download buttons, which
// must produce byte-identical files.
export function downloadProjectExport(
  format: ProjectExportFormat,
  project: ExportableProject | null | undefined,
  lines: EditorLine[],
): void {
  const slug = (project?.metadata?.songName || project?.title || 'lyrics')
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase();
  try {
    const content = format === 'lrc'
      ? compileLRC(lines, false, 'hundredths', project?.metadata ?? {}, 'lf', false, undefined, 0)
      : compileSRT(lines, 0, false, 'lf', {}, false, 0);
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  } catch { /* no-op */ }
}
