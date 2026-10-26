import { compileLRC, compileSRT } from '@/shared/utils/lrc';
import type { EditorLine } from '@/features/editor/editor.types';
import { artistDisplay, creditsOf, type ArtistCredit } from '@/features/artists/artist-credits';
import { getIncludeFeaturedInTitle } from '@/features/artists/include-featured-setting';

export type ProjectExportFormat = 'lrc' | 'srt';

interface ExportableProject {
  title?: string;
  metadata?: { songName?: string; songArtist?: string; songAlbum?: string; songLanguage?: string; artists?: ArtistCredit[] };
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
      ? compileLRC(lines, false, 'hundredths', {
        ti: project?.metadata?.songName || '',
        ar: artistDisplay(project?.metadata),
        al: project?.metadata?.songAlbum || '',
        lg: project?.metadata?.songLanguage || '',
      }, 'lf', false, undefined, 0, true, {
        // `[ar:]` comes from the credits; `[ti:]` only carries them when the export option is on.
        artists: creditsOf(project?.metadata),
        includeFeaturedInTitle: getIncludeFeaturedInTitle(),
      })
      : compileSRT(lines, 0, false, 'lf', {}, false, 0);
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  } catch { /* no-op */ }
}
