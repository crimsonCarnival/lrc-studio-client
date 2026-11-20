import { describe, expect, it } from 'vitest';
import { isSwipeAway, lineBoundsAt, loadMiniPlayer, lyricAfter, lyricAt, miniPlayerSettings, nearestCorner, nextReturnPath, restoredEditorMatches, saveMiniPlayer } from './mini-player';
import type { EditorLine } from '@/features/editor/editor.types';

const EDIT = '/ana/projects/band-song-abcdefghij/edit';

describe('nextReturnPath', () => {
  it('remembers the editor page that was left', () => {
    expect(nextReturnPath(EDIT, '/library', null)).toBe(EDIT);
    expect(nextReturnPath('/session/abc', '/', null)).toBe('/session/abc');
    expect(nextReturnPath('/project/local', '/explore', null)).toBe('/project/local');
  });

  it('keeps it while browsing from page to page', () => {
    expect(nextReturnPath('/library', '/explore', EDIT)).toBe(EDIT);
  });

  it('drops it once a page that owns the player opens', () => {
    expect(nextReturnPath('/library', EDIT, EDIT)).toBeNull();
    expect(nextReturnPath('/library', '/bo/projects/x-abcdefghij', EDIT)).toBeNull();
    expect(nextReturnPath('/library', '/project/new', EDIT)).toBeNull();
  });

  it('does not open from pages that are not the editor', () => {
    expect(nextReturnPath('/bo/projects/x-abcdefghij', '/library', null)).toBeNull();
    expect(nextReturnPath('/project/new', '/', null)).toBeNull();
  });
});

describe('lyricAt', () => {
  const lines = [
    { id: 's', type: 'section', label: 'Verse', timestamp: 0 },
    { id: 'a', text: 'First', timestamp: 1 },
    { id: 'b', text: 'Second', timestamp: 4 },
    { id: 'c', text: 'Untimed', timestamp: null },
  ] as EditorLine[];

  it('shows the latest line that has started, never a section', () => {
    expect(lyricAt(lines, 0.5)).toBeNull();
    expect(lyricAt(lines, 2)).toBe('First');
    expect(lyricAt(lines, 10)).toBe('Second');
  });

  it('previews the line coming next', () => {
    expect(lyricAfter(lines, 0.5)).toBe('First');
    expect(lyricAfter(lines, 2)).toBe('Second');
    expect(lyricAfter(lines, 10)).toBeNull();
  });
});

describe('miniPlayerSettings', () => {
  it('is on, bottom-right, playing and with lyrics by default', () => {
    expect(miniPlayerSettings(undefined)).toEqual({ enabled: true, position: 'bottom-right', keepPlaying: true, lyrics: true });
  });

  it('reads stored choices and ignores an unknown corner', () => {
    expect(miniPlayerSettings({ miniPlayer: false, miniPlayerPosition: 'top-left', miniPlayerKeepPlaying: false, miniPlayerLyrics: false }))
      .toEqual({ enabled: false, position: 'top-left', keepPlaying: false, lyrics: false });
    expect(miniPlayerSettings({ miniPlayerPosition: 'middle' }).position).toBe('bottom-right');
  });
});

describe('nearestCorner', () => {
  it('picks the quarter of the screen the point is in', () => {
    expect(nearestCorner(100, 100, 1000, 800)).toBe('top-left');
    expect(nearestCorner(900, 100, 1000, 800)).toBe('top-right');
    expect(nearestCorner(100, 700, 1000, 800)).toBe('bottom-left');
    expect(nearestCorner(900, 700, 1000, 800)).toBe('bottom-right');
  });
});

describe('isSwipeAway', () => {
  it('needs most of the card off screen', () => {
    expect(isSwipeAway(-50, 250, 390)).toBe(false);
    expect(isSwipeAway(-200, 100, 390)).toBe(true);
    expect(isSwipeAway(300, 600, 390)).toBe(true);
  });
});

describe('lineBoundsAt', () => {
  const timed = [
    { id: 'a', text: 'A', timestamp: 1 },
    { id: 'b', text: 'B', timestamp: 4, endTime: 6 },
    { id: 'c', text: 'C', timestamp: 8 },
  ] as EditorLine[];

  it('runs to the next line, the line\'s own end, or the end of the media', () => {
    expect(lineBoundsAt(timed, 2, 20)).toEqual({ a: 1, b: 4 });
    expect(lineBoundsAt(timed, 5, 20)).toEqual({ a: 4, b: 6 });
    expect(lineBoundsAt(timed, 9, 20)).toEqual({ a: 8, b: 20 });
    expect(lineBoundsAt(timed, 0.5, 20)).toBeNull();
  });
});

describe('saveMiniPlayer / loadMiniPlayer', () => {
  it('round-trips and rejects junk', () => {
    saveMiniPlayer({ kind: 'editor', returnTo: EDIT });
    expect(loadMiniPlayer()).toEqual({ kind: 'editor', returnTo: EDIT });
    sessionStorage.setItem('lrc.miniPlayer', '{"kind":"view"}');
    expect(loadMiniPlayer()).toBeNull();
    saveMiniPlayer(null);
    expect(loadMiniPlayer()).toBeNull();
  });
});

describe('restoredEditorMatches', () => {
  it('only brings back the editor of the project the app restored', () => {
    expect(restoredEditorMatches(EDIT, 'abcdefghij')).toBe(true);
    expect(restoredEditorMatches(EDIT, 'zzzzzzzzzz')).toBe(false);
    expect(restoredEditorMatches('/session/abcdefghij', 'abcdefghij')).toBe(false);
    expect(restoredEditorMatches(EDIT, null)).toBe(false);
  });
});
