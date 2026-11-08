// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { TooltipProvider } from '@ui/tooltip';
import PublicLyrics from './PublicLyrics';

const player = vi.hoisted(() => ({ isPlaying: false }));

vi.mock('@features/player/PlayerContext', () => ({
  usePlayer: () => ({
    currentTime: 0, hasMedia: true, isPlaying: player.isPlaying, playbackSpeed: 1, seek: vi.fn(), togglePlay: vi.fn(),
  }),
}));
vi.mock('@/features/settings/useSettings', () => ({ useSettings: () => ({ settings: {} }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

const lines = [
  { type: 'section', label: 'Verse one', text: '' },
  { text: 'Line one', timestamp: 2 },
  { text: 'Line two', timestamp: 5 },
] as never[];

// Everything that is not a lyric line: the heading scrim and the controls row.
function chrome(full: boolean) {
  const { container, unmount } = render(
    <TooltipProvider><PublicLyrics lines={lines} editorMode="lrc" fullLyrics={full} /></TooltipProvider>,
  );
  const html = [...container.querySelectorAll('[aria-hidden], [role="group"], button')]
    .filter((e) => !e.closest('.animate-preview-line-in'))
    .map((e) => e.outerHTML)
    .join('\n');
  unmount();
  return html;
}

describe('PublicLyrics overlays', () => {
  it.each([false, true])('draws the same scrim and controls paused and playing (full lyrics: %s)', (full) => {
    player.isPlaying = false;
    const paused = chrome(full);
    player.isPlaying = true;
    const playing = chrome(full);
    expect(paused).toBe(playing);
    expect(paused).not.toContain('backdrop-blur');
    expect(paused).not.toContain('shadow-lg');
  });

  it('keeps the heading scrim solid and inside the header', () => {
    const { container } = render(
      <TooltipProvider><PublicLyrics lines={lines} editorMode="lrc" /></TooltipProvider>,
    );
    const scrim = container.querySelector<HTMLElement>('[aria-hidden].-z-10');
    expect(scrim).not.toBeNull();
    expect(scrim!.className).toContain('h-full');
    expect(scrim!.style.background).not.toContain('gradient');
  });
});
