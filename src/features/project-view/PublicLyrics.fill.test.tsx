// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { TooltipProvider } from '@ui/tooltip';
import PublicLyrics from './PublicLyrics';

const m = vi.hoisted(() => ({ display: {} as Record<string, unknown> }));
vi.mock('@features/player/PlayerContext', () => ({
  usePlayer: () => ({ currentTime: 2.5, hasMedia: true, isPlaying: true, playbackSpeed: 1, seek: vi.fn(), togglePlay: vi.fn() }),
}));
vi.mock('@/features/settings/useSettings', () => ({ useSettings: () => ({ settings: { editor: { display: m.display } } }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

// One sung line with word times on both tracks, then the next line.
const lines = [
  {
    text: 'Hola mundo', secondary: 'Hello world', timestamp: 2,
    words: [{ word: 'Hola', time: 2 }, { word: 'mundo', time: 3 }],
    secondaryWords: [{ word: 'Hello', time: 2 }, { word: 'world', time: 3 }],
  },
  { text: 'Next', timestamp: 6 },
] as never[];

function fills() {
  const { container, unmount } = render(<TooltipProvider><PublicLyrics lines={lines} editorMode="words" /></TooltipProvider>);
  const main = container.querySelectorAll('[class*="whitespace-nowrap"][class*="absolute"]:not([data-secondary-fill])').length;
  const secondary = container.querySelectorAll('[data-secondary-fill]').length;
  const glow = container.querySelectorAll('.karaoke-fill-glow').length;
  const shadows = [...container.querySelectorAll<HTMLElement>('.karaoke-fill-glow, [class*="whitespace-nowrap"][class*="absolute"]')].map((e) => e.style.textShadow);
  unmount();
  return { main, secondary, glow, shadows };
}

beforeEach(() => { m.display = {}; });

describe('PublicLyrics karaoke fill track', () => {
  it('fills the main line only by default', () => {
    expect(fills()).toMatchObject({ secondary: 0 });
    expect(fills().main).toBeGreaterThan(0);
  });

  it('fills the secondary line only when asked, leaving the main line plain', () => {
    m.display = { karaokeFillTrack: 'secondary' };
    expect(fills()).toMatchObject({ main: 0 });
    expect(fills().secondary).toBeGreaterThan(0);
  });

  it('fills both', () => {
    m.display = { karaokeFillTrack: 'both' };
    const f = fills();
    expect(f.main).toBeGreaterThan(0);
    expect(f.secondary).toBeGreaterThan(0);
  });
});

describe('PublicLyrics karaoke fill style', () => {
  it('draws no halo at all for the plain style', () => {
    m.display = { karaokeFillStyle: 'plain' };
    const f = fills();
    expect(f.glow).toBe(0);
    expect(f.shadows.every((s) => s === 'none' || s === '')).toBe(true);
  });
});
