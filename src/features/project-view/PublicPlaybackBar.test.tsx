// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '@ui/tooltip';
import PublicPlaybackBar from './PublicPlaybackBar';

const mockTogglePlay = vi.fn();
const mockSeek = vi.fn();
const mockWide = vi.hoisted(() => ({ value: false }));
const mockSettings = vi.hoisted(() => ({ showWaveform: false }));

vi.mock('@/shared/hooks/useBreakpoint', () => ({ useBreakpoint: () => mockWide.value }));
vi.mock('@features/player/components/WaveformDisplay', () => ({ default: () => <div data-testid="waveform" /> }));

vi.mock('@features/player/PlayerContext', () => ({
  usePlayer: () => ({
    source: 'local',
    isPlaying: false,
    currentTime: 10,
    duration: 100,
    playbackSpeed: 1,
    hasMedia: true,
    isSeeking: false,
    loopA: null,
    loopB: null,
    local: { localUrl: 'blob:x' },
    yt: {},
    audioRef: { current: null },
    MIN_SPEED: 0.5,
    MAX_SPEED: 2,
    speedPresets: [0.75, 1, 1.25],
    togglePlay: mockTogglePlay,
    seek: mockSeek,
    applySpeed: vi.fn(),
    handleLoopChange: vi.fn(),
  }),
}));

vi.mock('@/features/settings/useSettings', () => ({
  useSettings: () => ({
    settings: {
      playback: {
        seekTime: 5,
        showWaveform: mockSettings.showWaveform,
      },
    },
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'projectView.hidePlayer': 'Hide player',
        'projectView.showPlayer': 'Show player',
        'projectView.play': 'Play',
        'projectView.pause': 'Pause',
        'projectView.previousLine': 'Previous line',
        'projectView.nextLine': 'Next line',
      };
      return translations[key] || key;
    },
  }),
}));

describe('PublicPlaybackBar hide player button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders hide player button when onHidePlayer is provided and calls it on click', () => {
    const onHidePlayer = vi.fn();
    render(
      <TooltipProvider>
        <PublicPlaybackBar
          lines={[]}
          hasInitialMedia={true}
          onHidePlayer={onHidePlayer}
        />
      </TooltipProvider>,
    );

    const hideBtn = screen.getByRole('button', { name: 'Hide player' });
    expect(hideBtn).toBeInTheDocument();
    fireEvent.click(hideBtn);
    expect(onHidePlayer).toHaveBeenCalledTimes(1);
  });

  it('does not render hide player button when onHidePlayer is not provided', () => {
    render(
      <TooltipProvider>
        <PublicPlaybackBar
          lines={[]}
          hasInitialMedia={true}
        />
      </TooltipProvider>,
    );

    expect(screen.queryByRole('button', { name: 'Hide player' })).toBeNull();
  });
});


describe('PublicPlaybackBar progress by width', () => {
  const lines = [
    { type: 'section', label: 'Verse one', text: '' },
    { text: 'Line one', timestamp: 5 },
    { type: 'section', label: 'Chorus one', text: '' },
    { text: 'Line two', timestamp: 40 },
  ] as never[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings.showWaveform = true;
  });

  it('on phones renders the section string and no waveform', () => {
    mockWide.value = false;
    render(<TooltipProvider><PublicPlaybackBar lines={lines} hasInitialMedia /></TooltipProvider>);
    expect(screen.getByRole('slider', { name: 'player.seekPlayback' })).toBeInTheDocument();
    expect(document.querySelectorAll('[data-segment]')).toHaveLength(2);
    expect(screen.queryByTestId('waveform')).toBeNull();
  });

  it('seeks through the player seek function from the string', () => {
    mockWide.value = false;
    render(<TooltipProvider><PublicPlaybackBar lines={lines} hasInitialMedia /></TooltipProvider>);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'player.seekPlayback' }), { key: 'ArrowRight' });
    expect(mockSeek).toHaveBeenCalledWith(15);
  });

  it('from lg up keeps the waveform and not the string', async () => {
    mockWide.value = true;
    render(<TooltipProvider><PublicPlaybackBar lines={lines} hasInitialMedia /></TooltipProvider>);
    expect(await screen.findByTestId('waveform')).toBeInTheDocument();
    expect(document.querySelector('[data-segment]')).toBeNull();
  });
});
