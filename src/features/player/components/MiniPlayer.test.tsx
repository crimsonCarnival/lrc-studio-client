import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@ui/tooltip';
import type { PlayerContextValue } from '../PlayerContext';

const m = vi.hoisted(() => ({ navigate: vi.fn(), player: {} as Partial<PlayerContextValue> }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o?.title ? `${k}:${o.title}` : k) }),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => m.navigate }));
vi.mock('../PlayerContext', () => ({ usePlayer: () => m.player }));

import { MiniPlayer } from './MiniPlayer';

const settings = { enabled: true, position: 'bottom-right', keepPlaying: true, lyrics: true } as const;
const lines = [
  { id: 'a', text: 'First line', timestamp: 1 },
  { id: 'b', text: 'Second line', timestamp: 5 },
];
const named = (label: string) => new RegExp(label.replace(/\./g, '\\.'));

function show(over: Partial<PlayerContextValue> = {}, props: Partial<Parameters<typeof MiniPlayer>[0]> = {}) {
  m.player = {
    hasMedia: true, isPlaying: true, currentTime: 2, duration: 100, source: 'local', local: { isVideo: false },
    lines: lines as PlayerContextValue['lines'], togglePlay: vi.fn(), seek: vi.fn(), registerVideoStage: vi.fn(),
    ...over,
  };
  const onClose = vi.fn();
  render(
    <TooltipProvider>
      <MiniPlayer returnTo="/ana/projects/song-abcdefghij/edit" title="Song – Band" settings={settings} aboveNav={false} onClose={onClose} {...props} />
    </TooltipProvider>,
  );
  return { onClose, player: m.player };
}

beforeEach(() => vi.clearAllMocks());

describe('MiniPlayer', () => {
  it('shows the song and the line being sung', () => {
    show();
    expect(screen.getByText('Song – Band')).toBeInTheDocument();
    expect(screen.getByText('First line')).toBeInTheDocument();
  });

  it('shows the time instead when lyrics are turned off', () => {
    show({}, { settings: { ...settings, lyrics: false } });
    expect(screen.queryByText('First line')).not.toBeInTheDocument();
  });

  it('leads back to the editor', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: named('player.mini.backTo:Song – Band') }));
    expect(m.navigate).toHaveBeenCalledWith('/ana/projects/song-abcdefghij/edit');
  });

  it('plays, pauses and steps between lines', async () => {
    const { player } = show();
    await userEvent.click(screen.getByRole('button', { name: named('player.mini.pause') }));
    expect(player.togglePlay).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: named('player.mini.nextLine') }));
    expect(player.seek).toHaveBeenCalledWith(5);
  });

  it('closes', async () => {
    const { onClose } = show();
    await userEvent.click(screen.getByRole('button', { name: named('player.mini.close') }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows a video\'s picture in the card', () => {
    const { player } = show({ source: 'youtube' });
    expect(player.registerVideoStage).toHaveBeenCalledWith(expect.any(HTMLElement), 46);
  });

  it('renders nothing without media', () => {
    show({ hasMedia: false });
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
