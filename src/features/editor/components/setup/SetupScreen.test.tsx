import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const uploads = [
  { id: 'u1', title: 'First upload', source: 'cloudinary', uploadUrl: 'https://res.cloudinary.com/x/video/upload/a.mp3' },
  { id: 'u2', title: 'Second upload', source: 'cloudinary', uploadUrl: 'https://res.cloudinary.com/x/video/upload/b.mp3' },
  { id: 'u3', title: 'A video', source: 'youtube', uploadUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
];

// Hoisted so the vi.mock factory below can close over it: tests set the next verdict to
// drive the availability check, which gates whether a YouTube URL is ever handed to the player.
const { ytVerify } = vi.hoisted(() => ({
  ytVerify: vi.fn<() => Promise<'playable' | 'blocked' | 'superseded'>>(async () => 'playable'),
}));

vi.mock('@/app/api', () => ({
  getAccessToken: () => true,
  uploads: {
    listMedia: vi.fn(async () => uploads),
    getMedia: vi.fn(async (id: string) => ({ upload: id === 'old' ? { id: 'old', title: 'Old upload', source: 'cloudinary', uploadUrl: 'https://res.cloudinary.com/x/video/upload/old.mp3' } : null })),
    saveMedia: vi.fn(),
    deleteMedia: vi.fn(),
  },
  lyrics: { parse: vi.fn() },
  songMetadata: { lookupTrack: vi.fn() },
}));
vi.mock('@/shared/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));
vi.mock('@/features/editor/music-library.service', () => ({ getMyMusicLibrary: vi.fn(async () => []) }));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: { id: 'me', preferences: {} } }) }));
vi.mock('react-google-recaptcha-v3', () => ({ useGoogleReCaptcha: () => ({ executeRecaptcha: undefined }) }));
vi.mock('@features/editor/components/setup/YoutubeSearchPanel', () => ({ default: () => <div data-testid="yt-search" /> }));
vi.mock('../lyrics-search/LyricsSearchBar', () => ({ default: () => null }));
vi.mock('@/features/artists/ArtistsSection', () => ({ ArtistsSection: () => null }));
vi.mock('@/features/artists/TitleFeatSuggestion', () => ({ TitleFeatSuggestion: () => null }));
vi.mock('@/features/player/hooks/useYouTubeAvailability', () => ({
  useYouTubeAvailability: () => ({ check: { state: 'idle' }, verify: ytVerify, reset: vi.fn() }),
  YT_UNAVAILABLE_KEYS: {},
}));

import { TooltipProvider } from '@ui/tooltip';
import SetupScreen from './SetupScreen';

// The layout is chosen by width (useBreakpoint('lg')), so each test states the window it runs in.
let width = 1280;
const originalMatchMedia = window.matchMedia;
beforeEach(() => {
  width = 1280;
  window.matchMedia = vi.fn((query: string) => {
    const m = /min-width:\s*([\d.]+)(rem|px)/.exec(query);
    const matches = m ? width >= parseFloat(m[1]) * (m[2] === 'rem' ? 16 : 1) : false;
    return { matches, media: query, onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() };
  }) as unknown as typeof window.matchMedia;
});
afterEach(() => { window.matchMedia = originalMatchMedia; });

function renderSetup(state?: unknown, search = '') {
  const playerRef = { current: { loadFromUrl: vi.fn(), loadYouTube: vi.fn(), loadLocalAudio: vi.fn() } };
  render(
    <MemoryRouter initialEntries={[{ pathname: '/project/new', search, state }]}>
      <TooltipProvider><SetupScreen onComplete={vi.fn()} playerRef={playerRef} /></TooltipProvider>
    </MemoryRouter>,
  );
  return playerRef;
}

describe('SetupScreen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts private and shows no public switch', () => {
    renderSetup();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByText('setup.private')).toBeInTheDocument();
    expect(screen.queryByText('setup.public')).not.toBeInTheDocument();
  });

  it('preselects the upload passed from the uploads library', async () => {
    const playerRef = renderSetup({ uploadId: 'u2' });
    await waitFor(() => expect(screen.getByText('setup.audioReady')).toBeInTheDocument());
    expect(screen.getByText('Second upload')).toBeInTheDocument();
    expect(playerRef.current.loadFromUrl).toHaveBeenCalledWith(uploads[1].uploadUrl, 'Second upload');
  });

  // The uploads library hands the id over in the URL; history state does not
  // survive the route's app-state reset or a reload of the setup page.
  it('preselects the upload named by ?uploadId=', async () => {
    const playerRef = renderSetup(undefined, '?uploadId=u2');
    await waitFor(() => expect(screen.getByText('setup.audioReady')).toBeInTheDocument());
    expect(screen.getByText('Second upload')).toBeInTheDocument();
    expect(playerRef.current.loadFromUrl).toHaveBeenCalledWith(uploads[1].uploadUrl, 'Second upload');
  });

  it('fetches a requested upload that is not in the recent list', async () => {
    const playerRef = renderSetup({ uploadId: 'old' });
    await waitFor(() => expect(screen.getByText('setup.audioReady')).toBeInTheDocument());
    expect(screen.getAllByText('Old upload').length).toBeGreaterThan(0);
    expect(playerRef.current.loadFromUrl).toHaveBeenCalledWith('https://res.cloudinary.com/x/video/upload/old.mp3', 'Old upload');
  });

  it('lists every upload in the "Your uploads" tab', async () => {
    const playerRef = renderSetup();
    fireEvent.click(screen.getByText('setup.tabUploads'));
    await waitFor(() => expect(screen.getByText('First upload')).toBeInTheDocument());
    fireEvent.click(screen.getByText('First upload'));
    expect(screen.getByText('setup.audioReady')).toBeInTheDocument();
    expect(playerRef.current.loadFromUrl).toHaveBeenCalledWith(uploads[0].uploadUrl, 'First upload');
  });
});

/**
 * Covers the paths that decide whether media reaches the player at all: the local file
 * input, both branches of the URL loader, the availability gate in front of YouTube, and
 * the pending-URL handoff from the player. These run through the rendered screen rather
 * than the handlers directly, so they stay honest if this logic is later moved into a hook
 * of its own — which is the point of having them.
 */
describe('SetupScreen: loading media', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ytVerify.mockResolvedValue('playable');
    sessionStorage.clear();
  });

  function openLocalTab() {
    fireEvent.click(screen.getByText('setup.tabLocal'));
  }

  function enterUrl(url: string) {
    fireEvent.change(screen.getByLabelText('setup.urlPlaceholder'), { target: { value: url } });
  }

  it('hands a chosen audio file straight to the player', () => {
    const playerRef = renderSetup();
    openLocalTab();
    const file = new File(['x'], 'my-song.mp3', { type: 'audio/mpeg' });
    fireEvent.change(document.getElementById('setup-audio-input')!, { target: { files: [file] } });

    expect(playerRef.current.loadLocalAudio).toHaveBeenCalledWith(file);
    expect(screen.getByText('setup.audioReady')).toBeInTheDocument();
    expect(screen.getByText('my-song.mp3')).toBeInTheDocument();
  });

  it('refuses a file that is not audio', () => {
    const playerRef = renderSetup();
    openLocalTab();
    const file = new File(['x'], 'cover.png', { type: 'image/png' });
    fireEvent.change(document.getElementById('setup-audio-input')!, { target: { files: [file] } });

    expect(playerRef.current.loadLocalAudio).not.toHaveBeenCalled();
    expect(screen.queryByText('setup.audioReady')).not.toBeInTheDocument();
  });

  it('loads a direct audio URL and records it as an upload', async () => {
    const { uploads: uploadsApi } = await import('@/app/api') as unknown as { uploads: { saveMedia: ReturnType<typeof vi.fn> } };
    const playerRef = renderSetup();
    openLocalTab();
    enterUrl('https://res.cloudinary.com/demo/video/upload/track.mp3');
    fireEvent.click(screen.getByText('player.load'));

    expect(playerRef.current.loadFromUrl).toHaveBeenCalledWith('https://res.cloudinary.com/demo/video/upload/track.mp3', 'track');
    expect(playerRef.current.loadYouTube).not.toHaveBeenCalled();
    await waitFor(() => expect(uploadsApi.saveMedia).toHaveBeenCalledWith(expect.objectContaining({
      source: 'cloudinary',
      uploadUrl: 'https://res.cloudinary.com/demo/video/upload/track.mp3',
      fileName: 'track.mp3',
      title: 'track',
    })));
  });

  it('verifies a YouTube URL before loading it', async () => {
    const playerRef = renderSetup();
    openLocalTab();
    enterUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    fireEvent.click(screen.getByText('player.load'));

    await waitFor(() => expect(playerRef.current.loadYouTube).toHaveBeenCalledWith('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
    expect(ytVerify).toHaveBeenCalledWith('dQw4w9WgXcQ');
    expect(screen.getByText('setup.audioReady')).toBeInTheDocument();
  });

  // The editor plays YouTube through the IFrame API, so an unembeddable video has to stay
  // out of the player entirely rather than loading and failing later.
  it('does not load a YouTube video the availability check rejects', async () => {
    ytVerify.mockResolvedValue('blocked');
    const playerRef = renderSetup();
    openLocalTab();
    enterUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    fireEvent.click(screen.getByText('player.load'));

    await waitFor(() => expect(ytVerify).toHaveBeenCalled());
    expect(playerRef.current.loadYouTube).not.toHaveBeenCalled();
    expect(screen.queryByText('setup.audioReady')).not.toBeInTheDocument();
  });

  // The player stashes a URL in sessionStorage when it sends someone here to start a
  // project with it; arriving with one should load it without a second click.
  it('auto-loads a URL left behind in sessionStorage and clears it', async () => {
    sessionStorage.setItem('pendingYtUrl', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const playerRef = renderSetup();

    await waitFor(() => expect(playerRef.current.loadYouTube).toHaveBeenCalledWith('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
    expect(sessionStorage.getItem('pendingYtUrl')).toBeNull();
  });

  it('loads a saved YouTube upload through the YouTube player, not the URL loader', async () => {
    const playerRef = renderSetup();
    fireEvent.click(screen.getByText('setup.tabUploads'));
    await waitFor(() => expect(screen.getByText('A video')).toBeInTheDocument());
    fireEvent.click(screen.getByText('A video'));

    expect(playerRef.current.loadYouTube).toHaveBeenCalledWith(uploads[2].uploadUrl);
    expect(playerRef.current.loadFromUrl).not.toHaveBeenCalled();
  });
});

describe('SetupScreen: phone steps', () => {
  const tab = (key: string) => screen.getByRole('tab', { name: new RegExp(key) });
  const footer = () => document.getElementById('setup-footer-message')!;
  const typeInto = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
  const pickAudio = () => {
    fireEvent.click(screen.getByText('setup.tabLocal'));
    fireEvent.change(document.getElementById('setup-audio-input')!, { target: { files: [new File(['x'], 'song-one.mp3', { type: 'audio/mpeg' })] } });
  };
  const typeLyrics = () => fireEvent.change(screen.getByPlaceholderText('setup.pasteLyricsDesc'), { target: { value: 'Line one\nLine two' } });

  beforeEach(() => { vi.clearAllMocks(); width = 360; });

  it('shows Song, Audio and Lyrics steps and moves between them freely', () => {
    renderSetup();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(tab('stepSong')).toHaveAttribute('aria-current', 'step');
    fireEvent.click(screen.getByText('setup.stepContinue'));
    expect(tab('stepAudio')).toHaveAttribute('aria-current', 'step');
    expect(document.activeElement).toBe(document.getElementById('setup-heading-2'));
    fireEvent.click(tab('stepLyrics'));
    expect(tab('stepLyrics')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('setup.stepStart')).toBeInTheDocument();
    fireEvent.click(tab('stepSong'));
    expect(screen.getByLabelText('setup.songName')).toBeVisible();
  });

  it('keeps what was entered when moving between steps', () => {
    renderSetup();
    typeInto('setup.songName', 'Song one');
    fireEvent.click(tab('stepAudio'));
    pickAudio();
    fireEvent.click(tab('stepLyrics'));
    typeLyrics();
    fireEvent.click(tab('stepSong'));
    expect(screen.getByLabelText('setup.songName')).toHaveValue('Song one');
    fireEvent.click(tab('stepAudio'));
    expect(screen.getByText('setup.audioReady')).toBeInTheDocument();
    fireEvent.click(tab('stepLyrics'));
    expect(screen.getByPlaceholderText('setup.pasteLyricsDesc')).toHaveValue('Line one\nLine two');
  });

  it('names the first missing requirement and enables Start only when all are met', () => {
    renderSetup();
    fireEvent.click(tab('stepLyrics'));
    expect(footer()).toHaveTextContent('setup.stepNeedIdentity');
    expect(screen.getByText('setup.stepStart')).toBeDisabled();

    fireEvent.click(tab('stepSong'));
    typeInto('setup.projectName', 'Test project');
    expect(footer()).toHaveTextContent('setup.stepNeedAudio');
    fireEvent.click(tab('stepAudio'));
    pickAudio();
    expect(footer()).toHaveTextContent('setup.stepNeedLyrics');
    fireEvent.click(tab('stepLyrics'));
    expect(screen.getByText('setup.stepStart')).toBeDisabled();
    typeLyrics();
    expect(footer()).toHaveTextContent('setup.stepReady');
    expect(screen.getByText('setup.stepStart')).toBeEnabled();
  });

  it('accepts a song name as the identity, like the desktop rule', () => {
    renderSetup();
    typeInto('setup.songName', 'Song one');
    fireEvent.click(tab('stepAudio'));
    expect(footer()).toHaveTextContent('setup.stepNeedAudio');
  });

  it('jumps to the step that needs attention when the message is tapped', () => {
    renderSetup();
    typeInto('setup.projectName', 'Test project');
    fireEvent.click(tab('stepLyrics'));
    fireEvent.click(footer());
    expect(tab('stepAudio')).toHaveAttribute('aria-current', 'step');
    pickAudio();
    fireEvent.click(tab('stepSong'));
    fireEvent.click(footer());
    expect(tab('stepLyrics')).toHaveAttribute('aria-current', 'step');
  });

  it('sends the same payload as the desktop layout for the same inputs', async () => {
    const run = async (w: number) => {
      width = w;
      const onComplete = vi.fn();
      const playerRef = { current: { loadFromUrl: vi.fn(), loadYouTube: vi.fn(), loadLocalAudio: vi.fn() } };
      const { unmount } = render(
        <MemoryRouter initialEntries={['/project/new']}>
          <TooltipProvider><SetupScreen onComplete={onComplete} playerRef={playerRef} /></TooltipProvider>
        </MemoryRouter>,
      );
      const phone = w < 1024;
      typeInto('setup.projectName', 'Test project');
      typeInto('setup.songName', 'Song one');
      if (phone) fireEvent.click(tab('stepAudio'));
      pickAudio();
      if (phone) fireEvent.click(tab('stepLyrics')); else fireEvent.click(screen.getByText('setup.tabLyrics'));
      typeLyrics();
      fireEvent.click(screen.getByText(phone ? 'setup.stepStart' : 'setup.startToSync'));
      await waitFor(() => expect(onComplete).toHaveBeenCalled());
      unmount();
      return onComplete.mock.calls[0][0];
    };
    const phone = await run(360);
    const desktop = await run(1280);
    // Parsed lines get a fresh random id per parse; everything else must match exactly.
    const strip = (d: { lines: { id?: string }[] }) => ({ ...d, lines: d.lines.map(({ id: _id, ...rest }) => rest) });
    expect(strip(phone)).toEqual(strip(desktop));
    expect(phone.name).toBe('Test project');
    expect(phone.lines.length).toBeGreaterThan(0);
  });

  it('uses the two-column layout on a wide window and has no public switch on the phone', () => {
    width = 1280;
    const { unmount } = render(
      <MemoryRouter><TooltipProvider><SetupScreen onComplete={vi.fn()} playerRef={null} /></TooltipProvider></MemoryRouter>,
    );
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    unmount();
    width = 360;
    renderSetup();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByText('setup.private')).toBeInTheDocument();
  });
});
