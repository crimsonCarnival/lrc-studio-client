export type PlayerSlot = 'editor' | 'header' | 'preview' | 'mobile';

export function usePlayerSlot({ hideEditor, hidePreview: _hidePreview, focusMode, isLg, isTouch }: {
  hideEditor: boolean; hidePreview: boolean; focusMode: string; isLg: boolean; isTouch: boolean;
}): PlayerSlot {
  if (isTouch || !isLg) return 'mobile';
  // editor hidden (preview-only) → preview slot
  if (hideEditor) return 'preview';
  // dedicated playback focus (but editor not strictly hidden) → header
  if (focusMode === 'playback') return 'header';
  return 'editor';
}
