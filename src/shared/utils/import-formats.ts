import { subtitleImportFormat } from './subtitle-parse';

/** File extensions the lyrics import takes (setup, the editor's import, drag and drop). */
export const IMPORT_EXTENSIONS = ['lrc', 'srt', 'txt', 'vtt', 'sbv', 'ass', 'ssa'] as const;

/** For `<input type="file" accept>`. */
export const IMPORT_ACCEPT = IMPORT_EXTENSIONS.map((ext) => `.${ext}`).join(',');

/** The import formats that carry end times, which open in the SRT editor: SRT itself plus VTT, SBV, ASS/SSA. */
export const SUBTITLE_ACCEPT = ['srt', 'vtt', 'sbv', 'ass', 'ssa', 'txt'].map((ext) => `.${ext}`).join(',');

export const extensionOf = (filename: string): string => filename.split('.').pop()?.toLowerCase() ?? '';

export const isImportExtension = (ext: string): boolean => (IMPORT_EXTENSIONS as readonly string[]).includes(ext);

/** Whether an imported file carries cue end times (SRT, VTT, SBV, ASS/SSA). */
export const isTimedSubtitleFile = (filename: string): boolean =>
  extensionOf(filename) === 'srt' || subtitleImportFormat(filename) !== null;

/**
 * The editor mode an import opens in. Word timing wins (enhanced LRC, VTT inline timestamps, ASS
 * karaoke): words mode is the only one that shows it, and the lines keep their end times anyway.
 * Otherwise a subtitle file opens in SRT mode for its end times, and anything else in LRC mode.
 */
export function importEditorMode(filename: string, lines: readonly { words?: readonly unknown[] }[]): 'words' | 'srt' | 'lrc' {
  if (lines.some((l) => (l.words?.length ?? 0) > 0)) return 'words';
  return isTimedSubtitleFile(filename) ? 'srt' : 'lrc';
}
