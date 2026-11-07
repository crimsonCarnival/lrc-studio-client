/**
 * Where the player's controls are drawn. 'phone' means the phone editor is on screen and
 * draws its own strip, so no other slot renders controls.
 */
export type PlayerSlot = 'editor' | 'header' | 'preview' | 'mobile' | 'phone';

// Chosen by width, not by input method: a touch tablet at `lg` or wider gets the desktop
// slots, and a narrow mouse window gets the phone ones.
export function usePlayerSlot({ hideEditor, hidePreview: _hidePreview, focusMode, isLg, phoneEditor = false }: {
  hideEditor: boolean; hidePreview: boolean; focusMode: string; isLg: boolean; phoneEditor?: boolean;
}): PlayerSlot {
  if (phoneEditor) return 'phone';
  if (!isLg) return 'mobile';
  // editor hidden (preview-only) → preview slot
  if (hideEditor) return 'preview';
  // dedicated playback focus (but editor not strictly hidden) → header
  if (focusMode === 'playback') return 'header';
  return 'editor';
}
