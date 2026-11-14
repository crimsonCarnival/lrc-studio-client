import { getAccessToken } from '@/app/api';
import { STORAGE_KEYS } from './storage.service';
import { sanitizeLines } from '@/shared/utils/sanitize-lines';

/**
 * Guards a guest's saved draft (localStorage `lrc-syncer-project`) against being replaced by an
 * empty project that is only empty because nothing has been restored yet (the first render, or
 * the editor re-entered after the setup screen reset the in-memory state).
 *
 * An empty project may overwrite a non-empty draft only after the user deliberately removed all
 * lyrics in this session.
 */
let clearedByUser = false;
let skipNextEmptyTransition = false;
/** The stored draft as it was when this tab cleared the lyrics (see guestLyricsCleared). */
let clearedDraftRaw: string | null = null;


function readRaw(): string | null {
  try { return localStorage.getItem(STORAGE_KEYS.PROJECT); } catch { return null; }
}

export function markGuestLyricsCleared(): void {
  clearedByUser = true;
  clearedDraftRaw = readRaw();
}

export function resetGuestLyricsCleared(): void {
  clearedByUser = false;
  skipNextEmptyTransition = false;
  clearedDraftRaw = null;
}

/**
 * This tab's user emptied the lyrics AND the stored draft is still what it was then. If another
 * tab has written a different draft since, that draft is not ours to suppress or overwrite: the
 * flag is module state of one tab, the draft is shared by all of them.
 */
export function guestLyricsCleared(): boolean {
  return clearedByUser && readRaw() === clearedDraftRaw;
}

/**
 * The next lines-went-to-zero transition is the app clearing memory on purpose (leaving the editor
 * for the setup screen with the draft kept), not the user removing lyrics.
 */
export function expectProgrammaticEmpty(): void {
  skipNextEmptyTransition = true;
}

/** Lines went from some to none inside the editor: the user deleted them, unless the app just reset. */
export function noteLinesBecameEmpty(): void {
  if (skipNextEmptyTransition) {
    skipNextEmptyTransition = false;
    return;
  }
  markGuestLyricsCleared();
}

/** Memory was already empty when the app reset it, so no empty transition will consume the expectation. */
export function dropProgrammaticEmptyExpectation(): void {
  skipNextEmptyTransition = false;
}

function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  // randomUUID exists only in secure contexts (http://<lan-ip> on a phone has none).
  if (typeof c?.randomUUID === 'function') {
    try { return c.randomUUID(); } catch { /* fall through */ }
  }
  return `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- stored JSON is untrusted and checked field by field */
/**
 * One stored line, validated by the same sanitizer every other load path uses (server loads,
 * shared links). A hand-written copy here used to keep only some fields, so a guest coming back
 * from the sign-in page or reloading lost every section's singers, each line's sing mode, per-word
 * singers, secondary timing and timing source. Only the id is settled here first: sanitizeLines
 * mints a missing one with crypto.randomUUID, which a phone on http://<lan-ip> does not have.
 */
function restoreLine(l: any): Record<string, unknown> | null {
  if (!(l && typeof l === 'object')) return null;
  const [line] = sanitizeLines([{ ...l, id: typeof l.id === 'string' ? l.id : newId() }]);
  return (line as Record<string, unknown> | undefined) ?? null;
}

export type RestoredGuestDraft = {
  lines: Record<string, unknown>[];
  /** The rest of the stored project (mode, media, metadata...), unvalidated beyond being an object. */
  parsed: Record<string, any>;
};

/**
 * The one place that reads and validates the stored guest draft. Never throws: a draft that cannot
 * be read, or holds no usable line, is `null`, and a bad line or word is dropped rather than
 * failing the rest. The restore and the "is there a draft" checks all go through it, so they can
 * not disagree about what is restorable.
 */
function reject(raw: string): null {
  // Unusable, but it is the user's text: keep it recoverable before anything resets the key.
  // Guests only: a signed-in user's local copy is not a guest draft, and the backup must not
  // outlive the person on a shared device (it is removed on sign-in, sign-out and new project).
  if (!getAccessToken()) {
    try { localStorage.setItem(STORAGE_KEYS.PROJECT_REJECTED, raw); } catch { /* ignore */ }
  }
  return null;
}

export function clearRejectedGuestDraft(): void {
  try { localStorage.removeItem(STORAGE_KEYS.PROJECT_REJECTED); } catch { /* ignore */ }
}

export function restoreGuestDraft(): RestoredGuestDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECT);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!(parsed && typeof parsed === 'object') || !Array.isArray(parsed.lines)) return reject(raw);
    const lines: Record<string, unknown>[] = [];
    for (const l of parsed.lines) {
      try {
        const line = restoreLine(l);
        if (line) lines.push(line);
      } catch { /* skip this line */ }
    }
    if (lines.length === 0) return parsed.lines.length === 0 ? null : reject(raw);
    return { lines, parsed };
  } catch (e) {
    console.warn('Guest draft could not be read', e);
    const raw = readRaw();
    return raw ? reject(raw) : null;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Number of restorable lines in the stored guest draft; 0 when there is none or it is unusable. */
export function storedGuestDraftLineCount(): number {
  return restoreGuestDraft()?.lines.length ?? 0;
}

/**
 * Whether a guest write of a project with `lineCount` lines may replace the stored draft.
 * Pure: it changes nothing. A non-empty project always may; an empty one only after the user
 * removed the lyrics, or when no usable draft is stored.
 */
export function mayWriteGuestDraft(lineCount: number): boolean {
  return lineCount > 0 || guestLyricsCleared() || storedGuestDraftLineCount() === 0;
}
