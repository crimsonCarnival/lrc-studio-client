import type { TFunction } from 'i18next';

/**
 * The "Press Space to stamp the active line" hint, with the literal Space/Espacio
 * swapped for the user's configured mark key. Shared by the in-list sync controls
 * and the in-editor player dock so the copy lives in one place (#4).
 *
 * The keys are selected dynamically, which i18next's strict literal-key overloads
 * reject, so `t` is cast to a loose callable for the lookups inside.
 */
export function getMarkInstruction(
  t: TFunction,
  editorMode: string | undefined,
  awaitingEndMark: number | null | undefined,
  markKey: string,
): string {
  const tr = t as unknown as (key: string) => string;
  const swap = (key: string) => tr(key).replace(/Space|Espacio/gi, markKey);
  if (editorMode === 'srt') {
    return awaitingEndMark != null
      ? swap('editor.markEndInstruction')
      : swap('editor.markInstructionSRT');
  }
  if (editorMode === 'words') return swap('editor.markInstructionWords');
  return swap('editor.markInstruction');
}
