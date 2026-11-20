import { isEditorPath, isProjectEditorPath, isProjectPath, publicIdFromSlugId } from '@/features/projects/project-path';
import type { EditorLine } from '@/features/editor/editor.types';

export type MiniPlayerPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export const MINI_PLAYER_POSITIONS: MiniPlayerPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export type MiniPlayerSettings = {
  enabled: boolean;
  position: MiniPlayerPosition;
  keepPlaying: boolean;
  lyrics: boolean;
};

/** The stored interface settings, defaults filled in and an unknown corner read as bottom-right. */
export function miniPlayerSettings(ui: Record<string, unknown> | undefined): MiniPlayerSettings {
  const position = ui?.miniPlayerPosition as MiniPlayerPosition | undefined;
  return {
    enabled: ui?.miniPlayer !== false,
    position: position && MINI_PLAYER_POSITIONS.includes(position) ? position : 'bottom-right',
    keepPlaying: ui?.miniPlayerKeepPlaying !== false,
    lyrics: ui?.miniPlayerLyrics !== false,
  };
}

/**
 * Pages that own the player themselves: the editor workspace, setup, and the public project
 * view (which mounts a player of its own). The mini player never shows over them.
 */
export function ownsPlayer(pathname: string): boolean {
  return isEditorPath(pathname) || isProjectPath(pathname) || pathname === '/project/new';
}

/**
 * Where the mini player leads back to after a navigation from `prev` to `next`: the editor page
 * just left, the one already held while browsing elsewhere, or null once a page that owns the
 * player is open again.
 */
export function nextReturnPath(prev: string, next: string, current: string | null): string | null {
  if (ownsPlayer(next)) return null;
  if (isEditorPath(prev)) return prev;
  return current;
}

/** The lyric line playing at `time`: the latest timed, non-section line that has started. */
export function lyricAt(lines: EditorLine[] | undefined, time: number): string | null {
  let best: { at: number; text: string } | null = null;
  for (const line of lines ?? []) {
    if (line.type === 'section' || line.timestamp == null || line.timestamp > time) continue;
    const text = line.text?.trim();
    if (text && (!best || line.timestamp >= best.at)) best = { at: line.timestamp, text };
  }
  return best?.text ?? null;
}

/** The next lyric line to be sung after `time`, for the faded preview under the current one. */
export function lyricAfter(lines: EditorLine[] | undefined, time: number): string | null {
  let best: { at: number; text: string } | null = null;
  for (const line of lines ?? []) {
    if (line.type === 'section' || line.timestamp == null || line.timestamp <= time) continue;
    const text = line.text?.trim();
    if (text && (!best || line.timestamp < best.at)) best = { at: line.timestamp, text };
  }
  return best?.text ?? null;
}

function lineStarts(lines: EditorLine[] | undefined): number[] {
  return (lines ?? [])
    .filter((l) => l.type !== 'section' && l.timestamp != null)
    .map((l) => l.timestamp as number)
    .sort((a, b) => a - b);
}

/**
 * Where "previous line" goes: the start of the line playing when it is more than a second in
 * (as a music player's previous restarts the track), else the line before it.
 */
export function previousLineStart(lines: EditorLine[] | undefined, time: number): number | null {
  const before = lineStarts(lines).filter((at) => at < time - 1);
  return before.length ? before[before.length - 1] : null;
}

/** Where "next line" goes: the first line starting after the playhead. */
export function nextLineStart(lines: EditorLine[] | undefined, time: number): number | null {
  return lineStarts(lines).find((at) => at > time + 0.05) ?? null;
}

/** The corner nearest a point (the card's centre where a drag let go). */
export function nearestCorner(x: number, y: number, width: number, height: number): MiniPlayerPosition {
  const v = y < height / 2 ? 'top' : 'bottom';
  const h = x < width / 2 ? 'left' : 'right';
  return `${v}-${h}`;
}

/**
 * A swipe that dismisses: the card was dragged sideways until most of it left the screen.
 * Only phones get it (a desktop drag that overshoots just lands in a corner).
 */
export function isSwipeAway(left: number, right: number, viewportWidth: number): boolean {
  const width = right - left;
  return left < -width * 0.5 || right > viewportWidth + width * 0.5;
}

/**
 * The span of the line playing at `time`, for looping it: from its start to its own end time
 * when it has one, else to the next line's start, else to the end of the media.
 */
export function lineBoundsAt(lines: EditorLine[] | undefined, time: number, duration: number): { a: number; b: number } | null {
  const timed = (lines ?? [])
    .filter((l) => l.type !== 'section' && l.timestamp != null)
    .sort((x, y) => (x.timestamp as number) - (y.timestamp as number));
  let index = -1;
  for (let i = 0; i < timed.length; i++) if ((timed[i].timestamp as number) <= time) index = i;
  if (index < 0) return null;
  const line = timed[index];
  const a = line.timestamp as number;
  const end = (line as { endTime?: number | null }).endTime;
  const b = end != null && end > a ? end : timed[index + 1]?.timestamp ?? duration;
  return b > a ? { a, b } : null;
}

// ——— Surviving a reload ———
// Per tab (sessionStorage): a reload brings the mini player back; a new tab starts clean.

const STORE_KEY = 'lrc.miniPlayer';

export type StoredMiniPlayer =
  | { kind: 'editor'; returnTo: string }
  | { kind: 'view'; snapshot: ViewSnapshot };

/** What a public project view hands to the mini player when it is left. */
export type ViewSnapshot = {
  returnTo: string;
  title: string;
  cover: string | null;
  /** The view's media, in the shape PlayerEngineProvider's initialMedia takes. */
  media: { type: string; url?: string; id?: string; [key: string]: unknown };
  time: number;
  playing: boolean;
  lines: EditorLine[];
  metadata: Record<string, unknown>;
};

export function saveMiniPlayer(value: StoredMiniPlayer | null): void {
  try {
    if (value) sessionStorage.setItem(STORE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(STORE_KEY);
  } catch {
    // Private mode or a full quota: the mini player just will not survive the reload.
  }
}

export function loadMiniPlayer(): StoredMiniPlayer | null {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as StoredMiniPlayer;
    if (value?.kind === 'editor' && typeof value.returnTo === 'string') return value;
    if (value?.kind === 'view' && typeof value.snapshot?.returnTo === 'string' && value.snapshot.media) return value;
    return null;
  } catch {
    return null;
  }
}

/**
 * Whether a remembered editor page is the project the app restored after a reload: only then
 * does the restored player hold its media. A session or the guest draft is never brought back.
 */
export function restoredEditorMatches(returnTo: string, activePublicId: string | null | undefined): boolean {
  if (!activePublicId || !isProjectEditorPath(returnTo)) return false;
  const segment = returnTo.split('/')[3];
  return publicIdFromSlugId(segment ? decodeURIComponent(segment) : undefined) === activePublicId;
}
