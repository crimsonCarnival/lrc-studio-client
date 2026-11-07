import { STORAGE_KEYS } from './storage.service';

/**
 * Guards a guest's saved draft (localStorage `lrc-syncer-project`) against being replaced by an
 * empty project that is only empty because nothing has been restored yet (the first render, or
 * the editor re-entered after the setup screen reset the in-memory state).
 *
 * An empty project may overwrite a non-empty draft only after the user deliberately removed all
 * lyrics in this session.
 */
let clearedByUser = false;

export function markGuestLyricsCleared(): void {
  clearedByUser = true;
}

export function guestLyricsCleared(): boolean {
  return clearedByUser;
}

/** Number of lyric lines in the stored guest draft; 0 when there is none or it is unreadable. */
export function storedGuestDraftLineCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECT);
    if (!raw) return 0;
    const lines = (JSON.parse(raw) as { lines?: unknown }).lines;
    return Array.isArray(lines) ? lines.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Whether a guest write of a project with `lineCount` lines may replace the stored draft.
 * A non-empty project always may (and ends the "cleared" state).
 */
export function mayWriteGuestDraft(lineCount: number): boolean {
  if (lineCount > 0) {
    clearedByUser = false;
    return true;
  }
  return clearedByUser || storedGuestDraftLineCount() === 0;
}
