import { describe, expect, it } from 'vitest';
import { lyricAfter, lyricAt, miniPlayerSettings, nextReturnPath } from './mini-player';
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
