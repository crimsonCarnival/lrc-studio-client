// Pure: index of the active lyric line for a playback position.
// Extracted from usePreview so the public viewer can compute it without the hook.
export function computeCurrentIndex(lines, playbackPosition, editorMode) {
  if (editorMode === 'srt' && !playbackPosition) return -1;

  let bestIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.timestamp == null) continue;

    if (line.timestamp <= playbackPosition) {
      if (editorMode === 'srt') {
        if (line.endTime != null && playbackPosition >= line.endTime) continue;
      }
      bestIdx = i;
    } else {
      break;
    }
  }
  return bestIdx;
}
