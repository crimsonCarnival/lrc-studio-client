import { isEditorPath, isProjectPath } from '@/features/projects/project-path';
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
