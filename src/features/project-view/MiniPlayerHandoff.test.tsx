import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, renderHook } from '@testing-library/react';

const m = vi.hoisted(() => ({ settings: {} as Record<string, unknown> }));
vi.mock('@features/player/PlayerContext', () => ({ usePlayer: () => ({ currentTime: 33, isPlaying: true, hasMedia: true, playbackSpeed: 0.75 }) }));
vi.mock('@/features/settings/useSettings', () => ({ useSettings: () => ({ settings: { interface: m.settings } }) }));

import MiniPlayerHandoff from './MiniPlayerHandoff';
import { resetHandoffForTests, useHandoff } from '@features/player/mini-handoff';
import { saveMiniPlayer } from '@features/player/mini-player';

const VIEW = '/ana/projects/band-song-abcdefghij';
const props = { returnTo: VIEW, title: 'Song – Band', cover: null, media: { type: 'youtube', url: 'https://youtu.be/x' }, lines: [], metadata: {} };

function leaveTo(path: string) {
  window.history.replaceState(null, '', VIEW);
  const { unmount } = render(<MiniPlayerHandoff {...props} />);
  window.history.replaceState(null, '', path);
  unmount();
  return renderHook(() => useHandoff()).result.current;
}

beforeEach(() => {
  m.settings = {};
  saveMiniPlayer(null);
  resetHandoffForTests();
});

describe('MiniPlayerHandoff', () => {
  it('hands the playback over, at its position, when the view is left for another page', () => {
    expect(leaveTo('/library')).toMatchObject({ returnTo: VIEW, time: 33, playing: true, speed: 0.75, title: 'Song – Band' });
  });

  it('hands nothing to a page that plays it itself', () => {
    expect(leaveTo('/ana/projects/other-zzzzzzzzzz')).toBeNull();
  });

  it('hands nothing when the mini player is turned off', () => {
    m.settings = { miniPlayer: false };
    expect(leaveTo('/library')).toBeNull();
  });
});

describe('after a reload', () => {
  it('brings the handed-over song back, paused', () => {
    saveMiniPlayer({ kind: 'view', snapshot: { ...props, time: 50, playing: true } });
    window.history.replaceState(null, '', '/library');
    resetHandoffForTests();
    expect(renderHook(() => useHandoff()).result.current).toMatchObject({ time: 50, playing: false });
  });
});
