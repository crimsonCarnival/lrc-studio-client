/** Text alignment of the public lyrics stage: a viewer preference, remembered on this device. */
export type LyricsAlignment = 'left' | 'center' | 'right';

const STORAGE_KEY = 'lrc_preview_alignment';

export function readStoredAlignment(): LyricsAlignment {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'left' || saved === 'center' || saved === 'right') return saved;
  } catch {
    // localStorage unavailable (private mode, etc.): fall through to the default.
  }
  return 'left';
}

export function storeAlignment(alignment: LyricsAlignment): void {
  try {
    localStorage.setItem(STORAGE_KEY, alignment);
  } catch {
    // localStorage unavailable (private mode, quota, etc.): alignment still applies for this session.
  }
}
