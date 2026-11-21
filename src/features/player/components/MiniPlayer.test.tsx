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
vi.mock('@/features/settings/useSettings', () => ({ useSettings: () => ({ settings: { shortcuts: {}, playback: { seekTime: 5 } } }) }));
vi.mock('./MiniPlayerSessionMembers', () => ({ MiniPlayerSessionMembers: ({ publicId }: { publicId: string }) => <div>members:{publicId}</div> }));

import { MiniPlayer } from './MiniPlayer';

const settings = { enabled: true, position: 'bottom-right', keepPlaying: true, lyrics: true } as const;
const lines = [
  { id: 'a', text: 'First line', timestamp: 1 },
  { id: 'b', text: 'Second line', timestamp: 5 },
];
const named = (label: string) => new RegExp(label.replace(/\./g, '\\.'));

function show(over: Partial<PlayerContextValue> = {}, props: Partial<Omit<Parameters<typeof MiniPlayer>[0], 'onPositionChange'>> = {}) {
  m.player = {
    hasMedia: true, isPlaying: true, currentTime: 2, duration: 100, source: 'local', local: { isVideo: false },
    lines: lines as PlayerContextValue['lines'], togglePlay: vi.fn(), seek: vi.fn(), registerVideoStage: vi.fn(),
    loopA: null, loopB: null, setLoop: vi.fn(), clearLoop: vi.fn(),
    ...over,
  };
  const onClose = vi.fn();
  render(
    <TooltipProvider>
      <MiniPlayer returnTo="/ana/projects/song-abcdefghij/edit" title="Song – Band" settings={settings} aboveNav={false} onClose={onClose} onPositionChange={vi.fn()} {...props} />
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
    expect(screen.getByText('Second line')).toBeInTheDocument();
  });

  it('shows the time instead when lyrics are turned off', () => {
    show({}, { settings: { ...settings, lyrics: false } });
    expect(screen.queryByText('First line')).not.toBeInTheDocument();
    expect(screen.queryByText('Second line')).not.toBeInTheDocument();
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

  it('opens the whole lyrics, and a tap on a line jumps there', async () => {
    const { player } = show();
    await userEvent.click(screen.getAllByRole('button', { name: named('player.mini.showLyrics') })[0]);
    const list = screen.getByRole('list', { name: 'player.mini.lyrics' });
    expect(list.querySelector('[aria-current="true"]')).toHaveTextContent('First line');
    await userEvent.click(screen.getByRole('button', { name: 'Second line' }));
    expect(player.seek).toHaveBeenCalledWith(5);
  });

  it('loops the line being sung, and stops looping', async () => {
    const { player } = show();
    await userEvent.click(screen.getByRole('button', { name: named('player.mini.loopLine') }));
    expect(player.setLoop).toHaveBeenCalledWith({ a: 1, b: 5 });
  });

  it('stops an active loop', async () => {
    const { player } = show({ loopA: 1, loopB: 5 });
    await userEvent.click(screen.getByRole('button', { name: named('player.mini.loopLine') }));
    expect(player.clearLoop).toHaveBeenCalled();
  });

  it('shrinks to a bubble and back', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: named('player.mini.minimize') }));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: named('player.mini.restore:Song – Band') }));
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('answers the player keys while browsing', async () => {
    const { player } = show();
    await userEvent.keyboard(' ');
    expect(player.togglePlay).toHaveBeenCalled();
    await userEvent.keyboard('{ArrowRight}');
    expect(player.seek).toHaveBeenCalledWith(7);
  });

  it('leaves the page-scrolling arrows alone', async () => {
    const { player } = show();
    await userEvent.keyboard('{ArrowDown}');
    expect(player.seek).not.toHaveBeenCalled();
  });

  it('shows who is in the session it came from', () => {
    show({}, { returnTo: '/session/abc123' });
    expect(screen.getByText('members:abc123')).toBeInTheDocument();
  });

  it('fills the words of the line as they are sung', () => {
    const karaoke = [{ id: 'k', text: 'Hello world', timestamp: 1, words: [{ word: 'Hello', time: 1 }, { word: 'world', time: 2, end: 3 }] }];
    show({ lines: karaoke as PlayerContextValue['lines'], currentTime: 2.5 });
    const fills = [...document.querySelectorAll('[data-karaoke-fill]')] as HTMLElement[];
    expect(fills.map((f) => f.textContent)).toEqual(['Hello', 'world']);
    // A sung word's clip reaches past its box on every side; a half-sung one stops at half.
    expect(fills[0].style.clipPath).toBe('inset(var(--karaoke-bleed) var(--karaoke-bleed) var(--karaoke-bleed) var(--karaoke-bleed))');
    expect(fills[1].style.clipPath).toBe('inset(var(--karaoke-bleed) 50% var(--karaoke-bleed) var(--karaoke-bleed))');
    // Read out once, as the whole line.
    expect(screen.getByText('Hello world')).toHaveClass('sr-only');
  });
});
