export type PlayerSlot = 'editor' | 'header' | 'mobile';

export function usePlayerSlot({ hideEditor, hidePreview: _hidePreview, focusMode, isLg, isTouch }: {
  hideEditor: boolean; hidePreview: boolean; focusMode: string; isLg: boolean; isTouch: boolean;
}): PlayerSlot {
  if (isTouch || !isLg) return 'mobile';
  // editor hidden (preview-only) or dedicated playback focus → header
  if (hideEditor || focusMode === 'playback') return 'header';
  return 'editor';
}
