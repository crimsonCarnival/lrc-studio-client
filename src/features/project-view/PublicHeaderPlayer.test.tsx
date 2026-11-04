// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '@ui/tooltip';

const mockTogglePlay = vi.fn();
const mockSeek = vi.fn();
let mockPlayerState = {
  isPlaying: false,
  currentTime: 45,
  duration: 180,
  hasMedia: true,
  isSeeking: false,
  togglePlay: mockTogglePlay,
  seek: mockSeek,
};

vi.mock('@features/player/PlayerContext', () => ({
  usePlayer: () => mockPlayerState,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'projectView.hidePlayer': 'Hide player',
        'projectView.showPlayer': 'Show player',
        'projectView.play': 'Play',
        'projectView.pause': 'Pause',
        'player.loading': 'Loading track...',
        'player.seekPlayback': 'Seek',
        'player.title': 'Player',
      };
      return translations[key] || key;
    },
  }),
}));

import { PublicHeaderPlayer } from './PublicHeaderPlayer';

describe('PublicHeaderPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlayerState = {
      isPlaying: false,
      currentTime: 45,
      duration: 180,
      hasMedia: true,
      isSeeking: false,
      togglePlay: mockTogglePlay,
      seek: mockSeek,
    };
  });

  it('renders nothing when there is no media and no initial media', () => {
    mockPlayerState.hasMedia = false;
    const { container } = render(
      <TooltipProvider>
        <PublicHeaderPlayer
          playerHidden={false}
          onTogglePlayer={vi.fn()}
          hasInitialMedia={false}
        />
      </TooltipProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders hide player button when playerHidden is false', () => {
    const onTogglePlayer = vi.fn();
    render(
      <TooltipProvider>
        <PublicHeaderPlayer
          playerHidden={false}
          onTogglePlayer={onTogglePlayer}
          hasInitialMedia={true}
        />
      </TooltipProvider>,
    );

    const hideBtn = screen.getByRole('button', { name: 'Hide player' });
    expect(hideBtn).toBeInTheDocument();

    fireEvent.click(hideBtn);
    expect(onTogglePlayer).toHaveBeenCalledTimes(1);
  });

  it('renders basic header player when playerHidden is true', () => {
    const onTogglePlayer = vi.fn();
    render(
      <TooltipProvider>
        <PublicHeaderPlayer
          playerHidden={true}
          onTogglePlayer={onTogglePlayer}
          hasInitialMedia={true}
        />
      </TooltipProvider>,
    );

    // Play button
    const playBtn = screen.getByRole('button', { name: 'Play' });
    expect(playBtn).toBeInTheDocument();
    fireEvent.click(playBtn);
    expect(mockTogglePlay).toHaveBeenCalledTimes(1);

    // Time display: 45s = 0:45, 180s = 3:00
    expect(screen.getByText('0:45')).toBeInTheDocument();
    expect(screen.getByText('/ 3:00')).toBeInTheDocument();

    // Show player button
    const showBtn = screen.getByRole('button', { name: 'Show player' });
    expect(showBtn).toBeInTheDocument();
    fireEvent.click(showBtn);
    expect(onTogglePlayer).toHaveBeenCalledTimes(1);
  });

  it('pauses when playing in basic header player', () => {
    mockPlayerState.isPlaying = true;
    render(
      <TooltipProvider>
        <PublicHeaderPlayer
          playerHidden={true}
          onTogglePlayer={vi.fn()}
          hasInitialMedia={true}
        />
      </TooltipProvider>,
    );

    const pauseBtn = screen.getByRole('button', { name: 'Pause' });
    expect(pauseBtn).toBeInTheDocument();
    fireEvent.click(pauseBtn);
    expect(mockTogglePlay).toHaveBeenCalledTimes(1);
  });

  it('allows seeking via scrubber when duration is available', () => {
    render(
      <TooltipProvider>
        <PublicHeaderPlayer
          playerHidden={true}
          onTogglePlayer={vi.fn()}
          hasInitialMedia={true}
        />
      </TooltipProvider>,
    );

    const slider = screen.getByRole('slider', { name: 'Seek' });
    expect(slider).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: '90' } });
    expect(mockSeek).toHaveBeenCalledWith(90);
  });
});

